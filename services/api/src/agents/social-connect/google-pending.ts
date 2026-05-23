import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { encryptSecret } from './token-crypto';

export interface GoogleBusinessAccountChoice {
  name: string;
  accountName: string;
  type?: string;
}

export interface GoogleOAuthPending {
  id: string;
  tenantId: string;
  userId: string;
  platform: 'google_business';
  accounts: GoogleBusinessAccountChoice[];
  encryptedAccessToken: string;
  encryptedRefreshToken: string | null;
  tokenExpiresAt: string;
  createdAt: string;
  expiresAt: string;
}

const TTL_MS = 15 * 60 * 1000;

export async function saveGoogleOAuthPending(input: {
  tenantId: string;
  userId: string;
  accounts: GoogleBusinessAccountChoice[];
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: string;
}) {
  const id = `google_pending_${uuidv4().slice(0, 10)}`;
  const now = new Date().toISOString();
  const doc: GoogleOAuthPending = {
    id,
    tenantId: input.tenantId,
    userId: input.userId,
    platform: 'google_business',
    accounts: input.accounts,
    encryptedAccessToken: encryptSecret(input.accessToken),
    encryptedRefreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : null,
    tokenExpiresAt: input.tokenExpiresAt,
    createdAt: now,
    expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
  };
  await db.set('social_oauth_pending', id, doc);
  return id;
}

export async function getGoogleOAuthPending(id: string, tenantId: string): Promise<GoogleOAuthPending | null> {
  const doc = (await db.get('social_oauth_pending', id)) as GoogleOAuthPending | null;
  if (!doc || doc.tenantId !== tenantId || doc.platform !== 'google_business') return null;
  if (new Date(doc.expiresAt).getTime() < Date.now()) {
    await db.delete('social_oauth_pending', id).catch(() => {});
    return null;
  }
  return doc;
}

export async function deleteGoogleOAuthPending(id: string) {
  await db.delete('social_oauth_pending', id).catch(() => {});
}
