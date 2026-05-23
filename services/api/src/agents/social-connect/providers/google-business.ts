import { envValue } from '../../../lib/env';
import { getOAuthRedirectUri } from '../config';
import type { SaveSocialAccountInput } from '../social-service';
import { decryptSecret } from '../token-crypto';
import {
  saveGoogleOAuthPending,
  type GoogleBusinessAccountChoice,
  type GoogleOAuthPending,
} from '../google-pending';

const GBP_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'openid',
  'email',
  'profile',
].join(' ');

const ACCOUNTS_API = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';

function clientId() {
  return envValue('GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_CLIENT_ID', 'YOUTUBE_CLIENT_ID')!;
}
function clientSecret() {
  return envValue('GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET', 'YOUTUBE_CLIENT_SECRET')!;
}

export function buildGoogleBusinessAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: getOAuthRedirectUri('google_business'),
    response_type: 'code',
    scope: GBP_SCOPES,
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
      redirect_uri: getOAuthRedirectUri('google_business'),
      grant_type: 'authorization_code',
    }),
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token exchange failed');
  }
  return data;
}

function formatGoogleBusinessApiError(status: number, message?: string): string {
  const msg = message || '';
  if (
    status === 429 ||
    /quota exceeded/i.test(msg) ||
    /requests per minute/i.test(msg)
  ) {
    return (
      'Google Business API rate limit hit (very low quota per minute). ' +
      'Wait 2–3 minutes, then click Connect once only. ' +
      'If this keeps happening, request a quota increase in Google Cloud Console → APIs → My Business Account Management API → Quotas.'
    );
  }
  if (/has not been used|is disabled/i.test(msg)) {
    return (
      'Enable My Business Account Management API in Google Cloud Console (same project as your OAuth client), wait a few minutes, then retry.'
    );
  }
  return msg || 'Could not load Google Business accounts. Enable Business Profile API in Google Cloud Console.';
}

async function listBusinessAccounts(accessToken: string): Promise<GoogleBusinessAccountChoice[]> {
  const res = await fetch(ACCOUNTS_API, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    accounts?: GoogleBusinessAccountChoice[];
    error?: { message: string; status?: string; code?: number };
  };
  if (!res.ok) {
    throw new Error(formatGoogleBusinessApiError(res.status, data.error?.message));
  }
  const accounts = data.accounts || [];
  if (!accounts.length) {
    throw new Error(
      'No Google Business Profile found for this Google account. Create one at business.google.com first.'
    );
  }
  return accounts;
}

function accountFromChoice(
  account: GoogleBusinessAccountChoice,
  tokens: { access_token: string; refresh_token?: string; expires_in: number },
  ctx: { tenantId: string; userId: string }
): SaveSocialAccountInput {
  const resourceId = account.name.replace(/^accounts\//, '');
  const label = account.accountName || resourceId;

  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    platform: 'google_business',
    platformUserId: resourceId,
    username: label.replace(/\s+/g, '').toLowerCase().slice(0, 48) || resourceId,
    displayName: label,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    scopes: GBP_SCOPES.split(' '),
    metadata: {
      accountResourceName: account.name,
      accountName: account.accountName,
      accountType: account.type,
    },
  };
}

export type GoogleBusinessOAuthResult =
  | { type: 'account'; input: SaveSocialAccountInput }
  | { type: 'account_selection'; pendingId: string; accounts: { name: string; accountName: string; type?: string }[] };

export async function completeGoogleBusinessOAuth(
  code: string,
  ctx: { tenantId: string; userId: string }
): Promise<GoogleBusinessOAuthResult> {
  const tokens = await exchangeCode(code);
  const accounts = await listBusinessAccounts(tokens.access_token);
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  if (accounts.length === 1) {
    return { type: 'account', input: accountFromChoice(accounts[0], tokens, ctx) };
  }

  const pendingId = await saveGoogleOAuthPending({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    accounts,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt,
  });

  return {
    type: 'account_selection',
    pendingId,
    accounts: accounts.map((a) => ({
      name: a.name,
      accountName: a.accountName,
      type: a.type,
    })),
  };
}

export function finalizeGoogleBusinessSelection(
  pending: GoogleOAuthPending,
  accountResourceName: string,
  ctx: { tenantId: string; userId: string }
): SaveSocialAccountInput {
  const account = pending.accounts.find((a) => a.name === accountResourceName);
  if (!account) {
    throw new Error('Invalid Google Business account selection');
  }

  const accessToken = decryptSecret(pending.encryptedAccessToken);
  const refreshToken = pending.encryptedRefreshToken
    ? decryptSecret(pending.encryptedRefreshToken)
    : undefined;
  const expiresIn = Math.max(
    60,
    Math.floor((new Date(pending.tokenExpiresAt).getTime() - Date.now()) / 1000)
  );

  return accountFromChoice(
    account,
    { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn },
    ctx
  );
}
