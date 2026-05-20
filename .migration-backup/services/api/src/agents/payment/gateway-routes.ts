import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { encryptSecret, decryptSecret } from '../social-connect/token-crypto';
import type { AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';

export const paymentGatewayRouter = Router();

type GatewayType = 'razorpay' | 'stripe' | 'paypal' | 'custom';

function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

function sanitizeGateway(doc: Record<string, unknown>) {
  return {
    id: doc.id,
    name: doc.name,
    type: doc.type,
    status: doc.status,
    testMode: doc.testMode,
    keyIdPreview: doc.keyIdPreview,
    webhookUrl: doc.webhookUrl,
    createdAt: doc.createdAt,
    lastUsedAt: doc.lastUsedAt,
  };
}

paymentGatewayRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const gateways = await db.query('payment_gateways', {
      filters: [{ field: 'tenantId', op: '==', value: req.user!.tenantId }],
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: 20,
    });
    res.json({
      gateways: gateways.map((g) => sanitizeGateway(g)),
      configured: gateways.some((g) => g.status === 'active'),
    });
  } catch (err) {
    next(err);
  }
});

paymentGatewayRouter.post('/', requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const { type, name, keyId, keySecret, webhookSecret, testMode } = req.body as {
      type?: GatewayType;
      name?: string;
      keyId?: string;
      keySecret?: string;
      webhookSecret?: string;
      testMode?: boolean;
    };

    if (!type || !['razorpay', 'stripe', 'paypal', 'custom'].includes(type)) {
      return res.status(400).json({ error: { message: 'Invalid gateway type' } });
    }
    if (!keyId?.trim() || !keySecret?.trim()) {
      return res.status(400).json({ error: { message: 'API key ID and secret are required' } });
    }

    const id = `pg_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const publicUrl = process.env.API_PUBLIC_URL || 'http://localhost:8081';

    const doc = {
      id,
      tenantId: req.user!.tenantId,
      type,
      name: name || type.charAt(0).toUpperCase() + type.slice(1),
      status: 'active',
      testMode: Boolean(testMode),
      encryptedKeyId: encryptSecret(keyId.trim()),
      encryptedKeySecret: encryptSecret(keySecret.trim()),
      encryptedWebhookSecret: webhookSecret?.trim() ? encryptSecret(webhookSecret.trim()) : null,
      keyIdPreview: maskKey(keyId.trim()),
      webhookUrl: `${publicUrl}/api/v1/payments/webhook`,
      createdAt: now,
      updatedAt: now,
      createdBy: req.user!.uid,
    };

    await db.set('payment_gateways', id, doc);

    if (type === 'razorpay') {
      process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || keyId.trim();
    }

    res.status(201).json({ gateway: sanitizeGateway(doc) });
  } catch (err) {
    next(err);
  }
});

paymentGatewayRouter.patch('/:id', requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const existing = await db.get('payment_gateways', req.params.id);
    if (!existing || existing.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Gateway not found' } });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof req.body.testMode === 'boolean') updates.testMode = req.body.testMode;
    if (req.body.status === 'active' || req.body.status === 'inactive') updates.status = req.body.status;
    if (req.body.name) updates.name = req.body.name;

    if (req.body.keyId && req.body.keySecret) {
      updates.encryptedKeyId = encryptSecret(req.body.keyId);
      updates.encryptedKeySecret = encryptSecret(req.body.keySecret);
      updates.keyIdPreview = maskKey(req.body.keyId);
    }

    await db.update('payment_gateways', req.params.id, updates);
    const updated = await db.get('payment_gateways', req.params.id);
    res.json({ gateway: sanitizeGateway(updated!) });
  } catch (err) {
    next(err);
  }
});

paymentGatewayRouter.delete('/:id', requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const existing = await db.get('payment_gateways', req.params.id);
    if (!existing || existing.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Gateway not found' } });
    }
    await db.delete('payment_gateways', req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/** Resolve Razorpay keys for tenant checkout (prefers tenant gateway, falls back to env) */
export async function getTenantRazorpayKeys(tenantId: string): Promise<{
  keyId: string;
  keySecret: string;
  testMode: boolean;
  source: 'tenant' | 'env';
} | null> {
  const gateways = await db.query('payment_gateways', {
    filters: [
      { field: 'tenantId', op: '==', value: tenantId },
      { field: 'type', op: '==', value: 'razorpay' },
      { field: 'status', op: '==', value: 'active' },
    ],
    limit: 1,
  });

  const gw = gateways[0];
  if (gw?.encryptedKeyId && gw?.encryptedKeySecret) {
    return {
      keyId: decryptSecret(gw.encryptedKeyId as string),
      keySecret: decryptSecret(gw.encryptedKeySecret as string),
      testMode: Boolean(gw.testMode),
      source: 'tenant',
    };
  }

  const envId = process.env.RAZORPAY_KEY_ID;
  const envSecret = process.env.RAZORPAY_KEY_SECRET;
  if (envId && envSecret) {
    return { keyId: envId, keySecret: envSecret, testMode: envId.startsWith('rzp_test'), source: 'env' };
  }

  return null;
}
