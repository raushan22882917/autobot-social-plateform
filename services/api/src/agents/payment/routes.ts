import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { publishEvent } from '../../lib/pubsub';
import { PubSubTopics } from '@autobot360/shared';
import type { AuthRequest } from '../../middleware/auth';
import { authMiddleware } from '../../middleware/auth';
import { createOrderFromPayment } from '../order/routes';
import { paymentGatewayRouter } from './gateway-routes';
import { getTenantRazorpayKeys } from './gateway-routes';

export const paymentRouter = Router();

paymentRouter.use('/gateways', authMiddleware, paymentGatewayRouter);

paymentRouter.post('/create-order', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { checkoutSessionId } = req.body;
    const session = await db.get('checkout_sessions', checkoutSessionId);
    if (!session) return res.status(404).json({ error: { message: 'Checkout session not found' } });

    const paymentId = `pay_${uuidv4().slice(0, 8)}`;
    const razorpayOrderId = `order_${uuidv4().slice(0, 12)}`;

    await db.set('payments', paymentId, {
      id: paymentId,
      tenantId: session.tenantId,
      checkoutSessionId,
      razorpayOrderId,
      amount: session.total,
      currency: 'INR',
      status: 'created',
      idempotencyKey: `payment_${paymentId}`,
      createdAt: new Date().toISOString(),
    });

    const keys = await getTenantRazorpayKeys(session.tenantId as string);

    res.json({
      paymentId,
      razorpayOrderId,
      amount: (session.total as number) * 100,
      currency: 'INR',
      key: keys?.keyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_simulated',
      testMode: keys?.testMode ?? true,
    });
  } catch (err) {
    next(err);
  }
});

// Public — simulate payment success in dev
paymentRouter.post('/simulate-success', async (req, res, next) => {
  try {
    const { checkoutSessionId, tenantId } = req.body;
    const session = await db.get('checkout_sessions', checkoutSessionId);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });

    const paymentId = `pay_${uuidv4().slice(0, 8)}`;
    const razorpayPaymentId = `pay_sim_${uuidv4().slice(0, 8)}`;

    await db.set('payments', paymentId, {
      id: paymentId,
      tenantId: tenantId || session.tenantId,
      checkoutSessionId,
      razorpayOrderId: `order_sim_${uuidv4().slice(0, 8)}`,
      razorpayPaymentId,
      amount: session.total,
      currency: 'INR',
      status: 'captured',
      capturedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    await publishEvent(PubSubTopics.PAYMENT_SUCCESS, {
      eventType: 'payment.success',
      tenantId: (tenantId || session.tenantId) as string,
      idempotencyKey: `payment_${razorpayPaymentId}`,
      payload: { paymentId, razorpayPaymentId, checkoutSessionId, amount: session.total, currency: 'INR' },
      metadata: { source: 'payment-agent' },
    });

    const order = await createOrderFromPayment(paymentId);
    res.json({ success: true, paymentId, razorpayPaymentId, order });
  } catch (err) {
    next(err);
  }
});

paymentRouter.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (secret && signature) {
      const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
      if (signature !== expected) return res.status(400).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body;
    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      await publishEvent(PubSubTopics.PAYMENT_SUCCESS, {
        eventType: 'payment.success',
        tenantId: payment.notes?.tenantId || 'unknown',
        idempotencyKey: `payment_${payment.id}`,
        payload: {
          paymentId: payment.id,
          razorpayPaymentId: payment.id,
          checkoutSessionId: payment.notes?.checkoutSessionId,
          amount: payment.amount / 100,
          currency: 'INR',
        },
        metadata: { source: 'payment-webhook' },
      });
    }
    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});
