import crypto from 'crypto';
import { Request } from 'express';

/**
 * Validate Meta (Instagram/Facebook) webhook signature
 */
export function validateMetaWebhook(req: Request): boolean {
  const signature = req.get('X-Hub-Signature-256');

  if (!signature) {
    console.warn('Missing X-Hub-Signature-256 header');
    return false;
  }

  const payload = JSON.stringify(req.body);
  const secret = process.env.META_WEBHOOK_SECRET;

  if (!secret) {
    console.error('META_WEBHOOK_SECRET not configured');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expectedSignature = `sha256=${hash}`;

  return signature === expectedSignature;
}

/**
 * Validate WhatsApp webhook signature
 */
export function validateWhatsAppWebhook(req: Request): boolean {
  const signature = req.get('X-Webhook-Signature');

  if (!signature) {
    console.warn('Missing X-Webhook-Signature header');
    return false;
  }

  const payload = JSON.stringify(req.body);
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;

  if (!secret) {
    console.error('WHATSAPP_WEBHOOK_SECRET not configured');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === hash;
}

/**
 * Validate Razorpay webhook signature
 */
export function validateRazorpayWebhook(req: Request): boolean {
  const signature = req.get('X-Razorpay-Signature');

  if (!signature) {
    console.warn('Missing X-Razorpay-Signature header');
    return false;
  }

  const payload = JSON.stringify(req.body);
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not configured');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === hash;
}

/**
 * Validate n8n internal webhook
 */
export function validateN8nWebhook(req: Request): boolean {
  const secret = req.get('X-Webhook-Secret');

  if (!secret) {
    console.warn('Missing X-Webhook-Secret header');
    return false;
  }

  const expectedSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!expectedSecret) {
    console.error('N8N_WEBHOOK_SECRET not configured');
    return false;
  }

  return secret === expectedSecret;
}

/**
 * Validate webhook timestamp (prevent replay attacks)
 */
export function validateWebhookTimestamp(timestamp: string | number, maxAgeSeconds: number = 300): boolean {
  const webhookTime = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  const currentTime = Math.floor(Date.now() / 1000);
  const age = currentTime - webhookTime;

  if (age < 0) {
    console.warn('Webhook timestamp is in the future');
    return false;
  }

  if (age > maxAgeSeconds) {
    console.warn(`Webhook timestamp is too old: ${age}s > ${maxAgeSeconds}s`);
    return false;
  }

  return true;
}

/**
 * Check idempotency key to prevent duplicate processing
 */
export async function checkIdempotencyKey(db: any, key: string): Promise<boolean> {
  try {
    const existing = await db.get('idempotency_keys', key);

    if (existing) {
      console.log(`Idempotency key already processed: ${key}`);
      return false;
    }

    // Store key with 24h TTL
    await db.set('idempotency_keys', key, {
      id: key,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return true;
  } catch (err) {
    console.error('Failed to check idempotency key:', err);
    return true; // Allow processing on error
  }
}

/**
 * Retry webhook with exponential backoff
 */
export async function retryWebhook(
  url: string,
  payload: any,
  maxAttempts: number = 5,
  initialDelayMs: number = 1000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Attempt': attempt.toString(),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`Webhook delivered successfully on attempt ${attempt}`);
        return true;
      }

      if (response.status >= 400 && response.status < 500) {
        // Don't retry on client errors
        console.error(`Webhook failed with client error: ${response.status}`);
        return false;
      }
    } catch (err) {
      console.error(`Webhook attempt ${attempt} failed:`, err);
    }

    if (attempt < maxAttempts) {
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      console.log(`Retrying webhook in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error(`Webhook failed after ${maxAttempts} attempts`);
  return false;
}
