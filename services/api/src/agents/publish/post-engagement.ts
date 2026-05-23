import { db } from '../../lib/db';
import { getSocialCredentials } from '../social-connect/token-store';
import type { SocialPlatform } from '../social-connect/config';
import { buildFacebookPostUrl, fetchInstagramPermalink } from './platform-post-url';
import {
  fetchFacebookEngagement,
  fetchInstagramEngagement,
  type PlatformEngagement,
} from './platforms/meta-engagement';
import { fetchYouTubeEngagement } from './platforms/youtube-engagement';

export async function loadPostEngagement(
  tenantId: string,
  post: Record<string, unknown>
): Promise<{ platforms: PlatformEngagement[]; totals: { likes: number; comments: number; views: number } }> {
  const results = (post.publishResults as Record<string, { ok?: boolean; platformPostId?: string; platformPostUrl?: string }>) || {};
  const platforms = (post.platforms as string[]) || [];
  const out: PlatformEngagement[] = [];

  for (const platform of platforms) {
    const pr = results[platform];
    if (!pr?.ok || !pr.platformPostId) {
      out.push({
        platform,
        platformPostId: '',
        metrics: {},
        comments: [],
        error: 'Not published yet or publish failed',
      });
      continue;
    }

    let creds = null;
    try {
      creds = await getSocialCredentials(tenantId, platform as SocialPlatform);
    } catch (err) {
      out.push({
        platform,
        platformPostId: pr.platformPostId,
        platformPostUrl: pr.platformPostUrl,
        metrics: {},
        comments: [],
        error: err instanceof Error ? err.message : 'Could not load social credentials',
      });
      continue;
    }
    if (!creds) {
      out.push({
        platform,
        platformPostId: pr.platformPostId,
        platformPostUrl: pr.platformPostUrl,
        metrics: {},
        comments: [],
        error: `${platform} not connected or token expired — reconnect in Social settings`,
      });
      continue;
    }

    try {
      if (platform === 'instagram') {
        const eng = await fetchInstagramEngagement(pr.platformPostId, creds);
        eng.platformPostUrl =
          pr.platformPostUrl || (await fetchInstagramPermalink(pr.platformPostId, creds.accessToken));
        out.push(eng);
      } else if (platform === 'facebook') {
        const eng = await fetchFacebookEngagement(pr.platformPostId, creds);
        eng.platformPostUrl =
          pr.platformPostUrl || buildFacebookPostUrl(pr.platformPostId, creds.metadata.pageId as string | undefined);
        out.push(eng);
      } else if (platform === 'youtube') {
        out.push(await fetchYouTubeEngagement(pr.platformPostId, creds));
      } else {
        out.push({
          platform,
          platformPostId: pr.platformPostId,
          platformPostUrl: pr.platformPostUrl,
          metrics: {},
          comments: [],
          error: 'Engagement not supported for this platform yet',
        });
      }
    } catch (err) {
      out.push({
        platform,
        platformPostId: pr.platformPostId,
        platformPostUrl: pr.platformPostUrl,
        metrics: {},
        comments: [],
        error: err instanceof Error ? err.message : 'Failed to load engagement',
      });
    }
  }

  const totals = out.reduce(
    (acc, p) => {
      acc.likes += p.metrics.likes || 0;
      acc.comments += p.metrics.comments ?? p.comments.length;
      acc.views += p.metrics.views || 0;
      return acc;
    },
    { likes: 0, comments: 0, views: 0 }
  );

  return { platforms: out, totals };
}

export async function enrichScheduledPost(post: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (post.productTitle) return post;
  const productId = post.productId as string | undefined;
  if (!productId) return { ...post, productTitle: post.headline || 'Studio post' };
  const product = await db.get('products', productId);
  return {
    ...post,
    productTitle: product?.title || post.headline || 'Unknown product',
    product: product
      ? {
          id: product.id,
          title: product.title,
          price: product.price,
          description: product.description,
          publicUrl: product.publicUrl,
          images: product.images,
        }
      : null,
  };
}
