import { getOAuthRedirectUri } from '../config';
import type { SaveSocialAccountInput } from '../social-service';

const SCOPES = ['user.info.basic', 'video.upload', 'video.publish'];

function clientKey() {
  return process.env.TIKTOK_CLIENT_KEY!;
}
function clientSecret() {
  return process.env.TIKTOK_CLIENT_SECRET!;
}

export function buildTikTokAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: clientKey(),
    scope: SCOPES.join(','),
    response_type: 'code',
    redirect_uri: getOAuthRedirectUri('tiktok'),
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
}

interface TikTokTokenResponse {
  access_token?: string;
  expires_in?: number;
  open_id?: string;
  refresh_token?: string;
  refresh_expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
  message?: string;
}

async function exchangeCode(code: string): Promise<TikTokTokenResponse> {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey(),
      client_secret: clientSecret(),
      code,
      grant_type: 'authorization_code',
      redirect_uri: getOAuthRedirectUri('tiktok'),
    }),
  });
  const data = (await res.json()) as TikTokTokenResponse & { data?: TikTokTokenResponse };
  const payload = data.data || data;
  if (!res.ok || !payload.access_token) {
    throw new Error(
      payload.error_description || payload.message || payload.error || 'TikTok token exchange failed'
    );
  }
  return payload;
}

async function getUserInfo(accessToken: string) {
  const res = await fetch('https://open.tiktokapis.com/v2/user/info/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'username'],
    }),
  });
  const data = (await res.json()) as {
    data?: {
      user?: {
        open_id?: string;
        union_id?: string;
        avatar_url?: string;
        display_name?: string;
        username?: string;
      };
    };
    error?: { message?: string };
  };
  if (!res.ok || !data.data?.user) {
    throw new Error(data.error?.message || 'Failed to load TikTok profile');
  }
  return data.data.user;
}

export async function completeTikTokOAuth(
  code: string,
  ctx: { tenantId: string; userId: string }
): Promise<SaveSocialAccountInput> {
  const tokens = await exchangeCode(code);
  const user = await getUserInfo(tokens.access_token!);
  const openId = user.open_id || tokens.open_id;
  if (!openId) throw new Error('TikTok did not return a user id');

  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    platform: 'tiktok',
    platformUserId: openId,
    username: user.username || user.display_name || openId,
    displayName: user.display_name || user.username || 'TikTok Account',
    profilePictureUrl: user.avatar_url,
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: new Date(Date.now() + (tokens.expires_in || 86400) * 1000).toISOString(),
    scopes: (tokens.scope || SCOPES.join(',')).split(',').map((s) => s.trim()),
    metadata: { unionId: user.union_id, openId },
  };
}
