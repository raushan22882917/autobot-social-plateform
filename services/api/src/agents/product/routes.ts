import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createProductSchema } from '@autobot360/shared';
import { db } from '../../lib/db';
import { publishEvent } from '../../lib/pubsub';
import { PubSubTopics } from '@autobot360/shared';
import type { AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { productAnalysisRouter } from './analysis-routes';

export const productRouter = Router();

productRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.query;
    const filters: { field: string; op: '=='; value: unknown }[] = [
      { field: 'tenantId', op: '==', value: req.user!.tenantId },
    ];
    if (status) filters.push({ field: 'status', op: '==', value: status });

    const products = await db.query('products', {
      filters,
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: 100,
    });
    res.json({ products, total: products.length });
  } catch (err) {
    next(err);
  }
});

productRouter.post('/', requireRole('owner', 'admin'), validate(createProductSchema), async (req: AuthRequest, res, next) => {
  try {
    const parsed = req.body;
    const id = `prod_${uuidv4().slice(0, 8)}`;
    const slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const now = new Date().toISOString();

    const product = {
      id,
      tenantId: req.user!.tenantId,
      ...parsed,
      slug,
      currency: 'INR',
      variants: parsed.variants || [],
      images: parsed.images || [],
      publicUrl: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/p/${slug}`,
      createdAt: now,
      updatedAt: now,
      createdBy: req.user!.uid,
    };

    await db.set('products', id, product);

    const sub = await db.get('subscriptions', req.user!.tenantId);
    if (sub) {
      await db.update('subscriptions', req.user!.tenantId, {
        usage: { ...(sub.usage as object), products: ((sub.usage as { products?: number })?.products || 0) + 1 },
      });
    }

    await publishEvent(PubSubTopics.PRODUCT_CREATED, {
      eventType: 'product.created',
      tenantId: req.user!.tenantId,
      userId: req.user!.uid,
      idempotencyKey: `product_${id}`,
      payload: { productId: id },
      metadata: { source: 'product-agent' },
    });

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

productRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const product = await db.get('products', req.params.id);
    if (!product || product.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

productRouter.put('/:id', requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const existing = await db.get('products', req.params.id);
    if (!existing || existing.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }
    const updated = { ...existing, ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    await db.set('products', req.params.id, updated);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

productRouter.delete('/:id', requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const existing = await db.get('products', req.params.id);
    if (!existing || existing.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }
    await db.update('products', req.params.id, { status: 'archived', updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

productRouter.use('/', productAnalysisRouter);
