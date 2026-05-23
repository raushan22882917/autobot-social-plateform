import { envValue, hasEnv } from '../../../lib/env';
import type { SaveSocialAccountInput } from '../social-service';

const GRAPH = 'https://graph.facebook.com/v21.0';

export interface WhatsAppEnvCredentials {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  notifyPhone?: string;
}

export function getWhatsAppEnvCredentials(): WhatsAppEnvCredentials | null {
  const accessToken = envValue(
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_TOKEN',
    'META_WHATSAPP_ACCESS_TOKEN'
  );
  const phoneNumberId = envValue('WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_PHONE_ID');
  if (!accessToken || !phoneNumberId) return null;

  return {
    accessToken,
    phoneNumberId,
    businessAccountId: envValue('WHATSAPP_BUSINESS_ACCOUNT_ID', 'WHATSAPP_WABA_ID'),
    notifyPhone: envValue('WHATSAPP_NOTIFY_PHONE', 'WHATSAPP_ALERT_PHONE'),
  };
}

export function isWhatsAppEnvConfigured(): boolean {
  return Boolean(getWhatsAppEnvCredentials());
}

/** India-friendly: digits only; default country code 91 if 10 digits. */
export function normalizeE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

interface PhoneNumberProfile {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
}

interface WabaPhoneRow {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
}

export async function listWhatsAppPhoneNumbers(
  accessToken: string,
  businessAccountId: string
): Promise<WabaPhoneRow[]> {
  const wabaId = businessAccountId.replace(/^whatsapp_business_accounts\//, '').trim();
  const params = new URLSearchParams({
    fields: 'id,display_phone_number,verified_name',
  });
  const res = await fetch(`${GRAPH}/${wabaId}/phone_numbers?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as { data?: WabaPhoneRow[]; error?: { message: string } };
  if (!res.ok) {
    throw new Error(data.error?.message || 'Could not list WhatsApp phone numbers for this WABA');
  }
  return data.data || [];
}

async function verifyPhoneNumber(accessToken: string, phoneId: string): Promise<PhoneNumberProfile> {
  const params = new URLSearchParams({
    fields: 'id,display_phone_number,verified_name,quality_rating',
  });
  const res = await fetch(`${GRAPH}/${phoneId}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as PhoneNumberProfile & { error?: { message: string } };
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || 'Could not verify WhatsApp phone number. Check token and Phone Number ID.');
  }
  return data;
}

/** Validate WhatsApp Cloud API token + phone number id (or resolve from WABA). */
export async function completeWhatsAppConnect(
  accessToken: string,
  phoneNumberId: string | undefined,
  businessAccountId: string | undefined,
  ctx: { tenantId: string; userId: string }
): Promise<SaveSocialAccountInput> {
  const token = accessToken.trim();
  if (!token || token.length < 20) {
    throw new Error(
      'Invalid access token. Use a permanent token from Meta → WhatsApp → API setup (same app as META_APP_ID).'
    );
  }

  let phoneId = phoneNumberId?.trim();
  let wabaId = businessAccountId?.trim();

  if (!phoneId && wabaId) {
    const numbers = await listWhatsAppPhoneNumbers(token, wabaId);
    if (!numbers.length) {
      throw new Error('No phone numbers found on this WhatsApp Business Account.');
    }
    if (numbers.length > 1) {
      throw new Error(
        `WABA has ${numbers.length} phone numbers. Enter the Phone Number ID for the number you want to use.`
      );
    }
    phoneId = numbers[0].id;
  }

  if (!phoneId) {
    throw new Error('Phone Number ID is required (Meta → WhatsApp → API setup).');
  }

  const data = await verifyPhoneNumber(token, phoneId);
  const displayPhone = data.display_phone_number || phoneId;
  const verifiedName = data.verified_name || 'WhatsApp Business';

  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    platform: 'whatsapp',
    platformUserId: phoneId,
    username: displayPhone.replace(/\D/g, '') || phoneId,
    displayName: verifiedName,
    accessToken: token,
    tokenExpiresAt: new Date('2099-12-31T00:00:00.000Z').toISOString(),
    scopes: ['whatsapp_business_messaging', 'whatsapp_business_management'],
    metadata: {
      phoneNumberId: phoneId,
      displayPhoneNumber: displayPhone,
      verifiedName,
      businessAccountId: wabaId || undefined,
      connectMode: 'cloud_api_token',
      metaAppId: envValue('META_APP_ID', 'FACEBOOK_APP_ID'),
    },
  };
}

function whatsappErrorHint(code?: number): string {
  if (code === 131030) {
    return ' Recipient must message your business first (24h window), or use an approved template.';
  }
  return '';
}

async function sendWhatsAppPayload(
  accessToken: string,
  phoneNumberId: string,
  toE164: string,
  payload: Record<string, unknown>
): Promise<string> {
  const to = normalizeE164(toE164);
  if (!to) throw new Error('Invalid recipient phone number');

  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, ...payload }),
  });
  const data = (await res.json()) as {
    messages?: { id: string }[];
    error?: { message: string; code?: number };
  };
  if (!res.ok) {
    throw new Error((data.error?.message || 'WhatsApp send failed') + whatsappErrorHint(data.error?.code));
  }
  return data.messages?.[0]?.id || `wa_${Date.now()}`;
}

export async function sendWhatsAppText(
  accessToken: string,
  phoneNumberId: string,
  toE164: string,
  body: string
): Promise<string> {
  return sendWhatsAppPayload(accessToken, phoneNumberId, toE164, {
    type: 'text',
    text: { body },
  });
}

export async function sendWhatsAppImage(
  accessToken: string,
  phoneNumberId: string,
  toE164: string,
  imageUrl: string,
  caption?: string
): Promise<string> {
  return sendWhatsAppPayload(accessToken, phoneNumberId, toE164, {
    type: 'image',
    image: { link: imageUrl },
    ...(caption ? { caption: caption.slice(0, 1024) } : {}),
  });
}

export function buildWhatsAppBusinessUrl(displayPhone?: string): string | undefined {
  const digits = (displayPhone || '').replace(/\D/g, '');
  if (!digits) return undefined;
  return `https://wa.me/${digits}`;
}
