import {
  sendWhatsAppImage,
  sendWhatsAppText,
  buildWhatsAppBusinessUrl,
} from '../../social-connect/providers/whatsapp';

export interface WhatsAppPublishInput {
  accessToken: string;
  phoneNumberId: string;
  caption: string;
  imageUrl?: string;
  linkUrl?: string;
  /** E.164 numbers — must be within 24h messaging window or use approved templates */
  recipients: string[];
  displayPhoneNumber?: string;
}

export interface WhatsAppPublishResult {
  platformPostId: string;
  platformPostUrl?: string;
  sentCount: number;
}

export async function publishToWhatsAppBusiness(
  input: WhatsAppPublishInput
): Promise<WhatsAppPublishResult> {
  const recipients = input.recipients.map((r) => r.trim()).filter(Boolean);
  if (!recipients.length) {
    throw new Error(
      'No publish recipients. Add customer phone numbers in Social → WhatsApp → Publish recipients (they must have messaged your business recently).'
    );
  }

  let caption = input.caption.trim();
  if (input.linkUrl && !caption.includes(input.linkUrl)) {
    caption = `${caption}\n\n${input.linkUrl}`.trim();
  }

  const messageIds: string[] = [];

  for (const to of recipients) {
    let id: string;
    if (input.imageUrl) {
      id = await sendWhatsAppImage(
        input.accessToken,
        input.phoneNumberId,
        to,
        input.imageUrl,
        caption
      );
    } else {
      id = await sendWhatsAppText(input.accessToken, input.phoneNumberId, to, caption);
    }
    messageIds.push(id);
  }

  return {
    platformPostId: messageIds[0] || `wa_batch_${Date.now()}`,
    platformPostUrl: buildWhatsAppBusinessUrl(input.displayPhoneNumber),
    sentCount: messageIds.length,
  };
}

export function parseWhatsAppRecipients(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
