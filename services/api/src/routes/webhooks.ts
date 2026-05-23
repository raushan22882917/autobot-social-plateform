import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { publishEvent } from '../lib/pubsub';
import { envValue } from '../lib/env';
import { handleWhatsAppInboundMessage } from '../agents/social-connect/whatsapp-inbound';

export const webhooksRouter = Router();

/** Meta webhook verification (Instagram / Facebook). */
webhooksRouter.get('/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = envValue('META_WEBHOOK_VERIFY_TOKEN', 'WEBHOOK_VERIFY_TOKEN') || 'autobot360';

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return res.status(200).send(String(challenge));
  }
  return res.status(403).send('Forbidden');
});

webhooksRouter.post('/meta', async (req, res, next) => {
  try {
    if (!validateMetaSignature(req)) {
      return res.status(401).json({ error: { message: 'Invalid signature' } });
    }

    const body = req.body as { object?: string; entry?: unknown[] };
    if (body.entry?.length) {
      for (const entry of body.entry as Record<string, unknown>[]) {
        const tenantId = await resolveTenantFromMetaEntry(entry);
        await publishEvent('comment.received', {
          tenantId: tenantId || 'tenant_unknown',
          platform: body.object === 'instagram' ? 'instagram' : 'facebook',
          payload: entry,
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/** WhatsApp Cloud API webhook (verify + messages). */
webhooksRouter.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = envValue('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'META_WEBHOOK_VERIFY_TOKEN') || 'autobot360';

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return res.status(200).send(String(challenge));
  }
  return res.status(403).send('Forbidden');
});

webhooksRouter.post('/whatsapp', async (req, res, next) => {
  try {
    const hasSignature = Boolean(req.get('X-Hub-Signature-256'));
    const devSkip =
      process.env.NODE_ENV !== 'production' &&
      !hasSignature &&
      envValue('WHATSAPP_WEBHOOK_ALLOW_UNSIGNED') !== 'false';
    if (!devSkip && !validateMetaSignature(req, 'WHATSAPP_WEBHOOK_SECRET', 'META_WEBHOOK_SECRET')) {
      return res.status(401).json({ error: { message: 'Invalid signature' } });
    }

    const body = req.body as {
      entry?: { changes?: { value?: { metadata?: { phone_number_id?: string }; messages?: unknown[] } }[] }[];
    };
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const phoneNumberId = value?.metadata?.phone_number_id;
    const tenantId = phoneNumberId
      ? await resolveTenantFromWhatsAppPhoneId(phoneNumberId)
      : null;

    if (value?.messages?.length && tenantId) {
      for (const message of value.messages as Record<string, unknown>[]) {
        const msgType = message.type as string | undefined;
        if (msgType && msgType !== 'text') continue;

        const text = (message as { text?: { body?: string } }).text?.body || '';
        const from = String(message.from || '');
        const messageId = String(message.id || uuidv4());

        const id = `comment_${uuidv4().slice(0, 8)}`;
        await db.set('comments', id, {
          id,
          tenantId,
          platform: 'whatsapp',
          platformMessageId: messageId,
          text,
          authorId: from,
          createdAt: new Date().toISOString(),
          status: 'pending',
        });

        void handleWhatsAppInboundMessage({ tenantId, from, messageId, text }).catch((err) => {
          console.warn('[whatsapp] auto-reply:', err instanceof Error ? err.message : err);
        });
      }
    }

    await publishEvent('comment.received', {
      tenantId: tenantId || 'tenant_unknown',
      platform: 'whatsapp',
      payload: body,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

function validateMetaSignature(req: { get: (h: string) => string | undefined; body: unknown }, secretKey?: string, fallbackKey?: string): boolean {
  const secret =
    envValue(secretKey || 'META_WEBHOOK_SECRET') || envValue(fallbackKey || 'META_APP_SECRET');
  if (!secret) return process.env.NODE_ENV !== 'production';

  const signature = req.get('X-Hub-Signature-256');
  if (!signature) return false;

  const raw = (req as { rawBody?: Buffer }).rawBody;
  const payload = raw ? raw.toString('utf8') : JSON.stringify(req.body);
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return signature === `sha256=${hash}`;
}

async function resolveTenantFromMetaEntry(entry: Record<string, unknown>): Promise<string | null> {
  const pageId = entry.id as string | undefined;
  if (!pageId) return null;

  const accounts = await db.query('social_accounts', {
    filters: [{ field: 'status', op: '==', value: 'active' }],
    limit: 200,
  });

  for (const a of accounts) {
    const meta = (a.metadata as Record<string, unknown>) || {};
    if (meta.pageId === pageId) return a.tenantId as string;
  }
  return null;
}

async function resolveTenantFromWhatsAppPhoneId(phoneNumberId: string): Promise<string | null> {
  const accounts = await db.query('social_accounts', {
    filters: [
      { field: 'platform', op: '==', value: 'whatsapp' },
      { field: 'status', op: '==', value: 'active' },
    ],
    limit: 50,
  });

  for (const a of accounts) {
    const meta = (a.metadata as Record<string, unknown>) || {};
    if (meta.phoneNumberId === phoneNumberId || a.platformUserId === phoneNumberId) {
      return a.tenantId as string;
    }
  }
  return null;
}
