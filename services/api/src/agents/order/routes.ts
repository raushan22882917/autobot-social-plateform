import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { publishEvent } from '../../lib/pubsub';
import { PubSubTopics } from '@autobot360/shared';
import type { AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { notifyOrderViaWhatsApp } from '../social-connect/whatsapp-notify';

export const orderRouter = Router();

async function sendOrderNotifications(
  tenantId: string,
  orderId: string,
  order: { orderNumber: string; total: number; customer?: { name?: string; phone?: string } }
) {
  const now = new Date().toISOString();
  await db.set('notifications', `notif_${uuidv4().slice(0, 8)}`, {
    tenantId,
    userId: 'system',
    type: 'order',
    title: 'New Order!',
    body: `Order ${order.orderNumber} — ₹${order.total}`,
    data: { orderId },
    read: false,
    channels: ['in_app'],
    createdAt: now,
  });

  const wa = await notifyOrderViaWhatsApp(tenantId, order);
  if (wa.sent) {
    await db.update('orders', orderId, {
      notificationsSent: { whatsapp: true, email: false, dashboard: true },
      updatedAt: now,
    });
  }
}

function displayCustomerName(raw?: string): string {
  const name = (raw || '').trim().replace(/^@/, '');
  return name || 'Customer';
}

/** Create a real order row as soon as checkout starts (Product Analysis Buy / auto-reply). */
export async function createPendingOrderFromCheckout(session: Record<string, unknown>) {
  const tenantId = session.tenantId as string;
  const sessionId = session.id as string;
  if (!tenantId || !sessionId) throw new Error('Invalid checkout session');

  const existing = await db.query('orders', {
    filters: [{ field: 'tenantId', op: '==', value: tenantId }],
    orderBy: { field: 'createdAt', direction: 'desc' },
    limit: 200,
  });
  const dup = existing.find((o) => o.checkoutSessionId === sessionId);
  if (dup) return dup;

  const orderCount = await db.count('orders', [{ field: 'tenantId', op: '==', value: tenantId }]);
  const id = `ord_${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  const sessionCustomer = (session.customer as Record<string, unknown>) || {};
  const customerName = displayCustomerName(
    (sessionCustomer.name as string) || (session.customerName as string)
  );

  const order = {
    id,
    tenantId,
    orderNumber: `AB-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`,
    customerId: (session.customerId as string) || `cust_${uuidv4().slice(0, 8)}`,
    customer: {
      name: customerName,
      email: (sessionCustomer.email as string) || '',
      phone: (sessionCustomer.phone as string) || '',
      platform: (session.platform as string) || (sessionCustomer.platform as string),
      commentId: (session.commentId as string) || (sessionCustomer.commentId as string),
    },
    items: session.items,
    subtotal: session.subtotal,
    tax: session.tax,
    shipping: session.shipping || 0,
    discount: session.discount || 0,
    total: session.total,
    currency: 'INR',
    status: 'pending_payment',
    checkoutSessionId: sessionId,
    paymentId: null,
    shippingAddress: session.shippingAddress || {},
    source: (session.source as string) || 'checkout',
    commentId: session.commentId,
    platform: session.platform,
    postId: session.postId,
    notificationsSent: { whatsapp: false, email: false, dashboard: false },
    createdAt: now,
    updatedAt: now,
  };

  await db.set('orders', id, order);
  return order;
}

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

  const tenantOrders = await db.query('orders', {
    filters: [{ field: 'tenantId', op: '==', value: payment.tenantId }],
    orderBy: { field: 'createdAt', direction: 'desc' },
    limit: 200,
  });
  const pending = tenantOrders.find(
    (o) =>
      o.checkoutSessionId === session.id &&
      (o.status === 'pending_payment' || !o.paymentId)
  );

  const now = new Date().toISOString();
  const sessionCustomer = (session.customer as Record<string, unknown>) || {};

  if (pending) {
    const customer = {
      name: displayCustomerName(
        (sessionCustomer.name as string) || (pending.customer as { name?: string })?.name
      ),
      email: (sessionCustomer.email as string) || (pending.customer as { email?: string })?.email || '',
      phone: (sessionCustomer.phone as string) || (pending.customer as { phone?: string })?.phone || '',
      platform:
        (session.platform as string) ||
        (sessionCustomer.platform as string) ||
        (pending.customer as { platform?: string })?.platform,
      commentId:
        (session.commentId as string) ||
        (sessionCustomer.commentId as string) ||
        (pending.customer as { commentId?: string })?.commentId,
    };

    await db.update('orders', pending.id as string, {
      status: 'confirmed',
      paymentId,
      customer,
      updatedAt: now,
      notificationsSent: { whatsapp: false, email: false, dashboard: true },
    });
    const order = { ...pending, status: 'confirmed', paymentId, customer, updatedAt: now };
    await db.update('checkout_sessions', session.id as string, { status: 'completed' });

    const items = session.items as { productId: string; quantity: number }[];
    for (const item of items) {
      const p = await db.get('products', item.productId);
      if (p && p.trackInventory) {
        await db.update('products', item.productId, {
          inventory: Math.max(0, ((p.inventory as number) || 0) - item.quantity),
        });
      }
    }

    await sendOrderNotifications(
      payment.tenantId as string,
      pending.id as string,
      { orderNumber: order.orderNumber as string, total: order.total as number, customer }
    );

    await publishEvent(PubSubTopics.ORDER_CREATED, {
      eventType: 'order.created',
      tenantId: payment.tenantId as string,
      idempotencyKey: `order_${pending.id}`,
      payload: { orderId: pending.id, orderNumber: order.orderNumber, total: order.total },
      metadata: { source: 'order-agent' },
    });

    return order;
  }

  const orderCount = await db.count('orders', [{ field: 'tenantId', op: '==', value: payment.tenantId }]);
  const id = `ord_${uuidv4().slice(0, 8)}`;

  const order = {
    id,
    tenantId: payment.tenantId,
    orderNumber: `AB-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`,
    customerId: session.customerId || `cust_${uuidv4().slice(0, 8)}`,
    customer: {
      name: displayCustomerName((sessionCustomer.name as string)),
      email: (sessionCustomer.email as string) || '',
      phone: (sessionCustomer.phone as string) || '',
      platform: (session.platform as string) || (sessionCustomer.platform as string),
      commentId: (session.commentId as string) || (sessionCustomer.commentId as string),
    },
    items: session.items,
    subtotal: session.subtotal,
    tax: session.tax,
    shipping: session.shipping || 0,
    discount: session.discount || 0,
    total: session.total,
    currency: 'INR',
    status: 'confirmed',
    paymentId,
    checkoutSessionId: session.id,
    shippingAddress: session.shippingAddress || {},
    source: (session.source as string) || 'direct',
    commentId: session.commentId,
    platform: session.platform,
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

  await sendOrderNotifications(payment.tenantId as string, id, {
    orderNumber: order.orderNumber,
    total: order.total as number,
    customer: order.customer as { name?: string; phone?: string },
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
