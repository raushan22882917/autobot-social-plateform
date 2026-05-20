import { getOAuthRedirectUri } from '../config';
import type { SaveSocialAccountInput } from '../social-service';

const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

function clientId() {
  return process.env.LINKEDIN_CLIENT_ID!;
}

function clientSecret() {
  return process.env.LINKEDIN_CLIENT_SECRET!;
}

export function getLinkedInScopes(): string[] {
  const raw =
    process.env.LINKEDIN_OAUTH_SCOPES ||
    'openid profile email w_member_social';
  return raw.split(/\s+/).filter(Boolean);
}

export function buildLinkedInAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId(),
    redirect_uri: getOAuthRedirectUri('linkedin'),
    state,
    scope: getLinkedInScopes().join(' '),
  });
  return `${AUTH_URL}?${params}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getOAuthRedirectUri('linkedin'),
      client_id: clientId(),
      client_secret: clientSecret(),
    }),
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'LinkedIn token exchange failed');
  }
  return data;
}

interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  locale?: string;
}

async function getUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as LinkedInUserInfo & { error?: string; message?: string };
  if (!res.ok || !data.sub) {
    throw new Error(data.message || data.error || 'Could not load LinkedIn profile');
  }
  return data;
}

/** Prefer first company page the user can administer (Marketing API scopes). */
async function getAdminOrganization(accessToken: string): Promise<{
  id: string;
  name: string;
  vanityName?: string;
} | null> {
  const scopes = getLinkedInScopes();
  if (!scopes.some((s) => s.includes('organization'))) {
    return null;
  }

  try {
    const url =
      'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName,vanityName,id)))';
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      elements?: Array<{
        organization?: {
          id?: number;
          localizedName?: string;
          vanityName?: string;
        };
      }>;
    };

    const org = data.elements?.[0]?.organization;
    if (!org?.id) return null;

    return {
      id: String(org.id),
      name: org.localizedName || 'LinkedIn Page',
      vanityName: org.vanityName,
    };
  } catch {
    return null;
  }
}

export async function completeLinkedInOAuth(
  code: string,
  ctx: { tenantId: string; userId: string }
): Promise<SaveSocialAccountInput> {
  const tokens = await exchangeCode(code);
  const user = await getUserInfo(tokens.access_token);
  const org = await getAdminOrganization(tokens.access_token);

  const displayName = org?.name || user.name || [user.given_name, user.family_name].filter(Boolean).join(' ') || 'LinkedIn';
  const username = org?.vanityName || user.email?.split('@')[0] || user.sub.slice(0, 12);
  const platformUserId = org ? `org:${org.id}` : `member:${user.sub}`;

  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    platform: 'linkedin',
    platformUserId,
    username,
    displayName,
    profilePictureUrl: user.picture,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    scopes: (tokens.scope || getLinkedInScopes().join(' ')).split(/\s+/).filter(Boolean),
    metadata: {
      linkedInSub: user.sub,
      email: user.email,
      accountType: org ? 'organization' : 'member',
      organizationId: org?.id,
    },
  };
}
