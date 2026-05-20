import { getOAuthRedirectUri } from '../config';
import type { SocialPlatform } from '../config';
import type { SaveSocialAccountInput } from '../social-service';

const GRAPH = 'https://graph.facebook.com/v21.0';

function metaAppId() {
  return process.env.META_APP_ID!;
}
function metaAppSecret() {
  return process.env.META_APP_SECRET!;
}

function scopesFor(platform: SocialPlatform): string[] {
  if (platform === 'instagram') {
    return [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
      'business_management',
    ];
  }
  return ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'business_management'];
}

export function buildMetaAuthUrl(platform: SocialPlatform, state: string): string {
  const params = new URLSearchParams({
    client_id: metaAppId(),
    redirect_uri: getOAuthRedirectUri(platform),
    state,
    scope: scopesFor(platform).join(','),
    response_type: 'code',
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

async function exchangeCode(platform: SocialPlatform, code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: metaAppId(),
    client_secret: metaAppSecret(),
    redirect_uri: getOAuthRedirectUri(platform),
    code,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${params}`);
  const data = (await res.json()) as { access_token?: string; error?: { message: string } };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || 'Meta token exchange failed');
  }
  return data.access_token;
}

async function toLongLivedToken(shortToken: string): Promise<{ token: string; expiresIn: number }> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: metaAppId(),
    client_secret: metaAppSecret(),
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${params}`);
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message: string } };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || 'Meta long-lived token exchange failed');
  }
  return { token: data.access_token, expiresIn: data.expires_in || 5184000 };
}

interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
}

async function getPages(userToken: string): Promise<MetaPage[]> {
  const params = new URLSearchParams({
    fields: 'id,name,access_token,instagram_business_account{id,username}',
    access_token: userToken,
  });
  const res = await fetch(`${GRAPH}/me/accounts?${params}`);
  const data = (await res.json()) as { data?: MetaPage[]; error?: { message: string } };
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to load Facebook Pages');
  }
  return data.data || [];
}

export async function completeMetaOAuth(
  platform: SocialPlatform,
  code: string,
  ctx: { tenantId: string; userId: string }
): Promise<SaveSocialAccountInput> {
  const shortToken = await exchangeCode(platform, code);
  const { token, expiresIn } = await toLongLivedToken(shortToken);
  const pages = await getPages(token);

  if (platform === 'instagram') {
    const page = pages.find((p) => p.instagram_business_account?.id);
    if (!page?.instagram_business_account) {
      throw new Error(
        'No Instagram Business account found. Link Instagram to a Facebook Page in Meta Business Suite, then try again.'
      );
    }
    const ig = page.instagram_business_account;
    return {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      platform,
      platformUserId: ig.id,
      username: ig.username || ig.id,
      displayName: `${page.name} (Instagram)`,
      accessToken: page.access_token,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scopes: scopesFor(platform),
      metadata: { pageId: page.id, pageName: page.name, igBusinessAccountId: ig.id },
    };
  }

  const page = pages[0];
  if (!page) {
    throw new Error('No Facebook Page found. Create a Facebook Page and try again.');
  }

  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    platform,
    platformUserId: page.id,
    username: page.name.replace(/\s+/g, '').toLowerCase(),
    displayName: page.name,
    accessToken: page.access_token,
    tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    scopes: scopesFor(platform),
    metadata: { pageId: page.id, pageName: page.name },
  };
}
