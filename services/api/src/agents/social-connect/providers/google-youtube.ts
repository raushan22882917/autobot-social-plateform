import { envValue } from '../../../lib/env';
import { getOAuthRedirectUri } from '../config';
import type { SaveSocialAccountInput } from '../social-service';

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
].join(' ');

function clientId() {
  return envValue('GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_CLIENT_ID', 'YOUTUBE_CLIENT_ID')!;
}
function clientSecret() {
  return envValue('GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET', 'YOUTUBE_CLIENT_SECRET')!;
}

export function buildYouTubeAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: getOAuthRedirectUri('youtube'),
    response_type: 'code',
    scope: YOUTUBE_SCOPES,
    state,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: getOAuthRedirectUri('youtube'),
      grant_type: 'authorization_code',
    }),
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token exchange failed');
  }
  return data;
}

async function getChannel(accessToken: string) {
  const params = new URLSearchParams({
    part: 'snippet',
    mine: 'true',
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    items?: Array<{ id: string; snippet?: { title?: string; customUrl?: string; thumbnails?: { default?: { url?: string } } } }>;
    error?: { message: string };
  };
  if (!res.ok || !data.items?.[0]) {
    throw new Error(data.error?.message || 'No YouTube channel found for this Google account');
  }
  return data.items[0];
}

export async function completeYouTubeOAuth(
  code: string,
  ctx: { tenantId: string; userId: string }
): Promise<SaveSocialAccountInput> {
  const tokens = await exchangeCode(code);
  const channel = await getChannel(tokens.access_token);
  const snippet = channel.snippet;

  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    platform: 'youtube',
    platformUserId: channel.id,
    username: snippet?.customUrl || snippet?.title || channel.id,
    displayName: snippet?.title || 'YouTube Channel',
    profilePictureUrl: snippet?.thumbnails?.default?.url,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    scopes: YOUTUBE_SCOPES.split(' '),
    metadata: { channelId: channel.id },
  };
}
