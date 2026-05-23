import { db } from '../../lib/db';
import { envValue } from '../../lib/env';
import { getSocialCredentials } from './token-store';
import { sendWhatsAppText, normalizeE164 } from './providers/whatsapp';

export async function getTenantWhatsAppNotifyPhone(tenantId: string): Promise<string | null> {
  const tenant = await db.get('tenants', tenantId);
  const fromTenant = (tenant?.whatsappNotifyPhone as string)?.trim();
  if (fromTenant) return normalizeE164(fromTenant);

  const fromEnv = envValue('WHATSAPP_NOTIFY_PHONE', 'WHATSAPP_ALERT_PHONE')?.trim();
  return fromEnv ? normalizeE164(fromEnv) : null;
}

/** Send order alert to store owner WhatsApp when Business API is connected. */
export async function notifyOrderViaWhatsApp(
  tenantId: string,
  order: {
    orderNumber: string;
    total: number;
    customer?: { name?: string; phone?: string };
  }
): Promise<{ sent: boolean; error?: string }> {
  const tenant = await db.get('tenants', tenantId);
  if (tenant?.whatsappAlertsEnabled === false) {
    return { sent: false, error: 'WhatsApp alerts disabled' };
  }

  const creds = await getSocialCredentials(tenantId, 'whatsapp');
  if (!creds) {
    return { sent: false, error: 'WhatsApp not connected' };
  }

  const phoneNumberId = (creds.metadata.phoneNumberId as string) || creds.accountId;
  const notifyTo = await getTenantWhatsAppNotifyPhone(tenantId);
  if (!notifyTo) {
    return { sent: false, error: 'No seller alert phone configured' };
  }

  const customerName = order.customer?.name || 'Customer';
  const body = [
    `🛒 New order ${order.orderNumber}`,
    `Customer: ${customerName}`,
    order.customer?.phone ? `Phone: ${order.customer.phone}` : '',
    `Total: ₹${Number(order.total).toLocaleString('en-IN')}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await sendWhatsAppText(creds.accessToken, phoneNumberId, notifyTo, body);
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : 'WhatsApp send failed',
    };
  }
}
