import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';

export const checkoutRouter = Router();

// Public checkout — no auth required
checkoutRouter.post('/session', async (req, res, next) => {
  try {
    const { productId, variantId, quantity = 1, tenantId } = req.body;
    const product = await db.get('products', productId);
    if (!product || (tenantId && product.tenantId !== tenantId)) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    let price = product.price as number;
    if (variantId && product.variants) {
      const variant = (product.variants as { id: string; price: number }[]).find((v) => v.id === variantId);
      if (variant) price = variant.price;
    }

    const subtotal = price * quantity;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;
    const id = `cs_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const session = {
      id,
      tenantId: product.tenantId,
      productId,
      variantId: variantId || null,
      quantity,
      items: [{ productId, variantId, title: product.title, quantity, price, total: subtotal }],
      subtotal,
      tax,
      shipping: 0,
      discount: 0,
      total,
      currency: 'INR',
      status: 'open',
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
      createdAt: now,
    };

    await db.set('checkout_sessions', id, session);
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

checkoutRouter.get('/session/:id', async (req, res, next) => {
  try {
    const session = await db.get('checkout_sessions', req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    res.json(session);
  } catch (err) {
    next(err);
  }
});

checkoutRouter.put('/session/:id', async (req, res, next) => {
  try {
    const session = await db.get('checkout_sessions', req.params.id);
    if (!session || session.status !== 'open') {
      return res.status(404).json({ error: { message: 'Session not found or expired' } });
    }
    const updated = { ...session, ...req.body, id: req.params.id };
    await db.set('checkout_sessions', req.params.id, updated);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
