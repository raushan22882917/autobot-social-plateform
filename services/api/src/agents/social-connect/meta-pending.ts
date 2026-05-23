import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import type { SocialPlatform } from './config';

export interface MetaPendingPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
}

export interface MetaOAuthPending {
  id: string;
  tenantId: string;
  userId: string;
  platform: SocialPlatform;
  pages: MetaPendingPage[];
  tokenExpiresAt: string;
  createdAt: string;
  expiresAt: string;
}

const TTL_MS = 15 * 60 * 1000;

export async function saveMetaOAuthPending(input: Omit<MetaOAuthPending, 'id' | 'createdAt' | 'expiresAt'> & { pages: MetaPendingPage[] }) {
  const id = `meta_pending_${uuidv4().slice(0, 10)}`;
  const now = new Date().toISOString();
  const doc: MetaOAuthPending = {
    id,
    tenantId: input.tenantId,
    userId: input.userId,
    platform: input.platform,
    pages: input.pages,
    tokenExpiresAt: input.tokenExpiresAt,
    createdAt: now,
    expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
  };
  await db.set('social_oauth_pending', id, doc);
  return id;
}

export async function getMetaOAuthPending(id: string, tenantId: string): Promise<MetaOAuthPending | null> {
  const doc = (await db.get('social_oauth_pending', id)) as MetaOAuthPending | null;
  if (!doc || doc.tenantId !== tenantId) return null;
  if (new Date(doc.expiresAt).getTime() < Date.now()) {
    await db.delete('social_oauth_pending', id).catch(() => {});
    return null;
  }
  return doc;
}

export async function deleteMetaOAuthPending(id: string) {
  await db.delete('social_oauth_pending', id).catch(() => {});
}
