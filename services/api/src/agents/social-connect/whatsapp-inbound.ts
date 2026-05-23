import { db } from '../../lib/db';
import { buildPurchaseAssistFlow } from '../../lib/gemini-social';
import { createCheckoutSession } from '../product/analysis-automation';
import { textHasPurchaseIntent } from '../product/product-analysis-store';
import { getSocialCredentials } from './token-store';
import { sendWhatsAppText } from './providers/whatsapp';

async function resolveProductForWhatsApp(
  tenantId: string,
  productId?: string
): Promise<Record<string, unknown> | null> {
  if (productId) {
    const p = await db.get('products', productId);
    if (p && p.tenantId === tenantId && p.status === 'active') return p;
  }

  const products = await db.query('products', {
    filters: [
      { field: 'tenantId', op: '==', value: tenantId },
      { field: 'status', op: '==', value: 'active' },
    ],
    orderBy: { field: 'createdAt', direction: 'desc' },
    limit: 1,
  });
  return products[0] || null;
}

/** When a customer DMs "buy" / price / order on WhatsApp, reply with checkout link (like IG/FB comments). */
export async function handleWhatsAppInboundMessage(input: {
  tenantId: string;
  from: string;
  messageId: string;
  text: string;
}): Promise<{ replied: boolean; error?: string }> {
  const text = (input.text || '').trim();
  if (!text || !textHasPurchaseIntent(text)) {
    return { replied: false };
  }

  const tenant = await db.get('tenants', input.tenantId);
  if (tenant?.whatsappAutoReplyEnabled === false) {
    return { replied: false, error: 'WhatsApp auto-reply disabled' };
  }

  const dedupeKey = `${input.tenantId}_${input.messageId}`;
  const existing = await db.get('whatsapp_replies', dedupeKey);
  if (existing) return { replied: false };

  const creds = await getSocialCredentials(input.tenantId, 'whatsapp');
  if (!creds) {
    return { replied: false, error: 'WhatsApp not connected' };
  }

  const product = await resolveProductForWhatsApp(
    input.tenantId,
    tenant?.whatsappDefaultProductId as string | undefined
  );
  if (!product) {
    return { replied: false, error: 'No active product for auto-reply' };
  }

  const phoneNumberId = (creds.metadata.phoneNumberId as string) || creds.accountId;

  try {
    const checkoutUrl = await createCheckoutSession(input.tenantId, product, 'whatsapp_auto', {
      platform: 'whatsapp',
      commentId: input.messageId,
      customerName: input.from,
    });

    const assist = await buildPurchaseAssistFlow({
      productTitle: product.title as string,
      productDescription: (product.description as string) || '',
      price: product.price as number,
      customerMessage: text,
      checkoutUrl,
    });

    const replyText = assist.suggestedReply.includes('http')
      ? assist.suggestedReply
      : `${assist.suggestedReply} ${checkoutUrl}`.trim();

    await sendWhatsAppText(creds.accessToken, phoneNumberId, input.from, replyText);

    const now = new Date().toISOString();
    await db.set('whatsapp_replies', dedupeKey, {
      id: dedupeKey,
      tenantId: input.tenantId,
      messageId: input.messageId,
      from: input.from,
      inboundText: text,
      replyText,
      checkoutUrl,
      productId: product.id,
      createdAt: now,
    });

    return { replied: true };
  } catch (err) {
    return {
      replied: false,
      error: err instanceof Error ? err.message : 'WhatsApp auto-reply failed',
    };
  }
}
