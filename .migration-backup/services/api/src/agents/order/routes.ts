import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { publishEvent } from '../../lib/pubsub';
import { PubSubTopics } from '@autobot360/shared';
import type { AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';

export const orderRouter = Router();

// Called internally after payment — also exposed for dev testing
export async function createOrderFromPayment(paymentId: string) {
  const payment = await db.get('payments', paymentId);
  if (!payment) throw new Error('Payment not found');

  const session = await db.get('checkout_sessions', payment.checkoutSessionId as string);
  if (!session) throw new Error('Checkout session not found');

  const existing = await db.query('orders', {
    filters: [{ field: 'paymentId', op: '==', value: paymentId }],
  });
  if (existing.length > 0) return existing[0];

  const orderCount = await db.count('orders', [{ field: 'tenantId', op: '==', value: payment.tenantId }]);
  const id = `ord_${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  const order = {
    id,
    tenantId: payment.tenantId,
    orderNumber: `AB-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`,
    customerId: session.customerId || `cust_${uuidv4().slice(0, 8)}`,
    customer: session.customer || { name: 'Customer', email: '', phone: '' },
    items: session.items,
    subtotal: session.subtotal,
    tax: session.tax,
    shipping: session.shipping || 0,
    discount: session.discount || 0,
    total: session.total,
    currency: 'INR',
    status: 'confirmed',
    paymentId,
    shippingAddress: session.shippingAddress || {},
    source: 'direct',
    notificationsSent: { whatsapp: false, email: false, dashboard: false },
    createdAt: now,
    updatedAt: now,
  };

  await db.set('orders', id, order);
  await db.update('checkout_sessions', session.id as string, { status: 'completed' });

  const product = session.items as { productId: string; quantity: number }[];
  for (const item of product) {
    const p = await db.get('products', item.productId);
    if (p && p.trackInventory) {
      await db.update('products', item.productId, {
        inventory: Math.max(0, ((p.inventory as number) || 0) - item.quantity),
      });
    }
  }

  await db.set('notifications', `notif_${uuidv4().slice(0, 8)}`, {
    tenantId: payment.tenantId,
    userId: 'system',
    type: 'order',
    title: 'New Order!',
    body: `Order ${order.orderNumber} — ₹${order.total}`,
    data: { orderId: id },
    read: false,
    channels: ['in_app'],
    createdAt: now,
  });

  await publishEvent(PubSubTopics.ORDER_CREATED, {
    eventType: 'order.created',
    tenantId: payment.tenantId as string,
    idempotencyKey: `order_${id}`,
    payload: { orderId: id, orderNumber: order.orderNumber, total: order.total },
    metadata: { source: 'order-agent' },
  });

  return order;
}

orderRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const orders = await db.query('orders', {
      filters: [{ field: 'tenantId', op: '==', value: req.user!.tenantId }],
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: 50,
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

orderRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const order = await db.get('orders', req.params.id);
    if (!order || order.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Order not found' } });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

orderRouter.put('/:id/status', requireRole('owner', 'admin', 'editor'), async (req: AuthRequest, res, next) => {
  try {
    const { status, trackingNumber } = req.body;
    const order = await db.get('orders', req.params.id);
    if (!order || order.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Order not found' } });
    }
    await db.update('orders', req.params.id, {
      status,
      trackingNumber: trackingNumber || order.trackingNumber,
      updatedAt: new Date().toISOString(),
    });
    const updated = await db.get('orders', req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
