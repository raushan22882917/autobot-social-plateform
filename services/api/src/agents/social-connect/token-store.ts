import { db } from '../../lib/db';
import { decryptSecret } from './token-crypto';
import type { SocialPlatform } from './config';

export interface SocialCredentials {
  accountId: string;
  platform: SocialPlatform;
  accessToken: string;
  refreshToken?: string;
  metadata: Record<string, unknown>;
}

export async function getSocialCredentials(
  tenantId: string,
  platform: SocialPlatform
): Promise<SocialCredentials | null> {
  const accounts = await db.query('social_accounts', {
    filters: [
      { field: 'tenantId', op: '==', value: tenantId },
      { field: 'platform', op: '==', value: platform },
      { field: 'status', op: '==', value: 'active' },
    ],
    limit: 1,
  });

  const account = accounts[0];
  if (!account) return null;

  const tokenDoc = await db.get('social_tokens', account.id as string);
  if (!tokenDoc?.encryptedAccessToken) return null;

  try {
    const accessToken = decryptSecret(tokenDoc.encryptedAccessToken as string);
    let refreshToken: string | undefined;
    if (tokenDoc.encryptedRefreshToken) {
      try {
        refreshToken = decryptSecret(tokenDoc.encryptedRefreshToken as string);
      } catch {
        refreshToken = undefined;
      }
    }
    return {
      accountId: account.id as string,
      platform,
      accessToken,
      refreshToken,
      metadata: (account.metadata as Record<string, unknown>) || {},
    };
  } catch {
    console.warn(
      `[social] Could not decrypt ${platform} token for tenant ${tenantId} — reconnect the account in Social settings`
    );
    return null;
  }
}
