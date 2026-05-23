import { envValue } from '../../../lib/env';
import { getOAuthRedirectUri } from '../config';
import type { SocialPlatform } from '../config';
import type { SaveSocialAccountInput } from '../social-service';
import type { MetaPendingPage } from '../meta-pending';
import { saveMetaOAuthPending } from '../meta-pending';

const GRAPH = 'https://graph.facebook.com/v21.0';

function metaAppId() {
  return envValue('META_APP_ID', 'FACEBOOK_APP_ID', 'INSTAGRAM_APP_ID')!;
}
function metaAppSecret() {
  return envValue('META_APP_SECRET', 'FACEBOOK_APP_SECRET', 'INSTAGRAM_APP_SECRET')!;
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

export interface MetaPage {
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

function buildAccountFromPage(
  platform: SocialPlatform,
  page: MetaPage,
  ctx: { tenantId: string; userId: string },
  tokenExpiresAt: string
): SaveSocialAccountInput {
  if (platform === 'instagram') {
    const ig = page.instagram_business_account;
    if (!ig?.id) {
      throw new Error('Selected page has no linked Instagram Business account.');
    }
    return {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      platform,
      platformUserId: ig.id,
      username: ig.username || ig.id,
      displayName: `${page.name} (Instagram)`,
      accessToken: page.access_token,
      tokenExpiresAt,
      scopes: scopesFor(platform),
      metadata: { pageId: page.id, pageName: page.name, igBusinessAccountId: ig.id },
    };
  }

  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    platform,
    platformUserId: page.id,
    username: page.name.replace(/\s+/g, '').toLowerCase(),
    displayName: page.name,
    accessToken: page.access_token,
    tokenExpiresAt,
    scopes: scopesFor(platform),
    metadata: { pageId: page.id, pageName: page.name },
  };
}

export type MetaOAuthCompleteResult =
  | { type: 'account'; input: SaveSocialAccountInput }
  | { type: 'page_selection'; pendingId: string; pages: { id: string; name: string; hasInstagram: boolean }[] };

export async function completeMetaOAuth(
  platform: SocialPlatform,
  code: string,
  ctx: { tenantId: string; userId: string }
): Promise<MetaOAuthCompleteResult> {
  const shortToken = await exchangeCode(platform, code);
  const { token, expiresIn } = await toLongLivedToken(shortToken);
  const pages = await getPages(token);
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  if (platform === 'instagram') {
    const igPages = pages.filter((p) => p.instagram_business_account?.id);
    if (!igPages.length) {
      throw new Error(
        'No Instagram Business account found. Link Instagram to a Facebook Page in Meta Business Suite, then try again.'
      );
    }
    if (igPages.length === 1) {
      return { type: 'account', input: buildAccountFromPage(platform, igPages[0], ctx, tokenExpiresAt) };
    }
    const pendingId = await saveMetaOAuthPending({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      platform,
      pages: igPages as MetaPendingPage[],
      tokenExpiresAt,
    });
    return {
      type: 'page_selection',
      pendingId,
      pages: igPages.map((p) => ({
        id: p.id,
        name: p.name,
        hasInstagram: true,
      })),
    };
  }

  if (!pages.length) {
    throw new Error('No Facebook Page found. Create a Facebook Page in Meta Business Suite, then try again.');
  }
  if (pages.length === 1) {
    return { type: 'account', input: buildAccountFromPage(platform, pages[0], ctx, tokenExpiresAt) };
  }

  const pendingId = await saveMetaOAuthPending({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    platform,
    pages: pages as MetaPendingPage[],
    tokenExpiresAt,
  });
  return {
    type: 'page_selection',
    pendingId,
    pages: pages.map((p) => ({
      id: p.id,
      name: p.name,
      hasInstagram: Boolean(p.instagram_business_account?.id),
    })),
  };
}

export function finalizeMetaPageSelection(
  platform: SocialPlatform,
  page: MetaPendingPage,
  ctx: { tenantId: string; userId: string },
  tokenExpiresAt: string
): SaveSocialAccountInput {
  return buildAccountFromPage(platform, page as MetaPage, ctx, tokenExpiresAt);
}
