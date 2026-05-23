import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { encryptSecret } from './token-crypto';
import type { SocialPlatform } from './config';
import { completeWhatsAppConnect } from './providers/whatsapp';

export interface SaveSocialAccountInput {
  tenantId: string;
  userId: string;
  platform: SocialPlatform;
  platformUserId: string;
  username: string;
  displayName: string;
  profilePictureUrl?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: string;
  scopes: string[];
  metadata?: Record<string, unknown>;
}

export function sanitizeAccountForClient(account: Record<string, unknown>) {
  return {
    id: account.id,
    platform: account.platform,
    username: account.username,
    displayName: account.displayName,
    profilePictureUrl: account.profilePictureUrl || '',
    status: account.status,
    connectedAt: account.connectedAt,
    tokenExpiresAt: account.tokenExpiresAt,
    scopes: account.scopes,
  };
}

export async function saveSocialAccount(input: SaveSocialAccountInput) {
  const now = new Date().toISOString();
  const existing = await db.query('social_accounts', {
    filters: [
      { field: 'tenantId', op: '==', value: input.tenantId },
      { field: 'platform', op: '==', value: input.platform },
      { field: 'status', op: '==', value: 'active' },
    ],
  });

  const id =
    (existing[0]?.id as string) || `sa_${uuidv4().slice(0, 8)}`;

  const account = {
    id,
    tenantId: input.tenantId,
    platform: input.platform,
    platformUserId: input.platformUserId,
    username: input.username,
    displayName: input.displayName,
    profilePictureUrl: input.profilePictureUrl || '',
    secretRef: `social_tokens/${id}`,
    tokenExpiresAt: input.tokenExpiresAt,
    scopes: input.scopes,
    status: 'active',
    lastValidatedAt: now,
    connectedAt: existing[0]?.connectedAt || now,
    updatedAt: now,
    connectedBy: input.userId,
    metadata: input.metadata || {},
  };

  await db.set('social_accounts', id, account);
  await db.set('social_tokens', id, {
    accountId: id,
    tenantId: input.tenantId,
    encryptedAccessToken: encryptSecret(input.accessToken),
    encryptedRefreshToken: input.refreshToken
      ? encryptSecret(input.refreshToken)
      : null,
    updatedAt: now,
  });

  return account;
}

export async function connectWhatsAppAccount(
  accessToken: string,
  phoneNumberId: string,
  businessAccountId: string | undefined,
  ctx: { tenantId: string; userId: string }
) {
  const input = await completeWhatsAppConnect(accessToken, phoneNumberId, businessAccountId, ctx);
  return saveSocialAccount(input);
}
