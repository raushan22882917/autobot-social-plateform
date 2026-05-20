import { Router } from 'express';
import { db } from '../lib/db';
import { publishEvent, getEventLog } from '../lib/pubsub';
import { createOrderFromPayment } from '../agents/order/routes';
import { executeScheduledPost } from '../agents/publish/publish-executor';

export const internalRouter = Router();

function validateInternalKey(req: { headers: Record<string, unknown> }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) {
  const key = req.headers['x-internal-api-key'];
  if (key !== process.env.INTERNAL_API_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

internalRouter.use(validateInternalKey);

internalRouter.post('/idempotency/check', async (req, res) => {
  const { key } = req.body;
  const existing = await db.get('idempotency_keys', key);
  if (existing) return res.json({ status: 'duplicate' });
  await db.set('idempotency_keys', key, {
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
  res.json({ status: 'new' });
});

internalRouter.post('/pubsub/publish', async (req, res, next) => {
  try {
    const { eventType, tenantId, payload, idempotencyKey } = req.body;
    const topic = `autobot360.${eventType}`;
    await publishEvent(topic, { eventType, tenantId, idempotencyKey, payload, metadata: { source: 'n8n' } });

    if (eventType === 'payment.success' && payload?.paymentId) {
      await createOrderFromPayment(payload.paymentId);
    }

    res.json({ published: true });
  } catch (err) {
    next(err);
  }
});

internalRouter.get('/scheduled-posts/due', async (req, res) => {
  const limit = parseInt(req.query.limit as string || '100', 10);
  const now = new Date().toISOString();
  const posts = await db.query('scheduled_posts', {
    filters: [
      { field: 'status', op: '==', value: 'pending' },
      { field: 'scheduledAt', op: '<=', value: now },
    ],
    limit,
  });
  res.json({ posts });
});

internalRouter.get('/scheduled-posts/:id', async (req, res) => {
  const post = await db.get('scheduled_posts', req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

internalRouter.patch('/scheduled-posts/:id', async (req, res) => {
  await db.update('scheduled_posts', req.params.id, { ...req.body, updatedAt: new Date().toISOString() });
  const post = await db.get('scheduled_posts', req.params.id);
  res.json(post);
});

internalRouter.post('/scheduled-posts/:id/publish', async (req, res, next) => {
  try {
    const result = await executeScheduledPost(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

internalRouter.get('/events', (_req, res) => {
  res.json({ events: getEventLog() });
});

internalRouter.post('/orders/from-payment/:paymentId', async (req, res, next) => {
  try {
    const order = await createOrderFromPayment(req.params.paymentId);
    res.json(order);
  } catch (err) {
    next(err);
  }
});
