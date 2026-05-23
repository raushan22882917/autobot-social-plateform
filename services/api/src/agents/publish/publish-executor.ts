import { db } from '../../lib/db';
import { generateStudioPost, isGeminiConfigured } from '../../lib/gemini';
import { getSocialCredentials } from '../social-connect/token-store';
import type { SocialPlatform } from '../social-connect/config';
import { publishToFacebookPage, publishToInstagram } from './platforms/meta-publish';
import { publishToYouTube } from './platforms/youtube-publish';
import { publishToWhatsAppBusiness, parseWhatsAppRecipients } from './platforms/whatsapp-publish';
import { collectImageUrls, collectVideoUrls, buildYouTubeTitle } from './media-utils';

const processing = new Set<string>();

export interface PlatformPublishResult {
  ok: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
}

async function buildCaption(
  post: Record<string, unknown>,
  product: Record<string, unknown> | null
): Promise<string> {
  let caption = (post.caption as string) || '';
  const hashtags = post.hashtags as string[] | undefined;

  if (!caption && post.useAiCaption && product && isGeminiConfigured()) {
    const generated = await generateStudioPost({
      productTitle: (product.title as string) || 'Product',
      productDescription: (product.description as string) || '',
      price: product.price as number,
      platforms: (post.platforms as string[]) || ['instagram'],
      imageUrls: collectImageUrls(post, product).slice(0, 4),
    });
    caption = generated.caption;
    if (generated.hashtags?.length && !hashtags?.length) {
      post.hashtags = generated.hashtags;
    }
  }

  if (!caption && product) {
    caption = `${product.title}\n\n${(product.description as string) || ''}`.trim();
  }

  const tags = hashtags?.length
    ? hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')
    : '';
  if (tags) caption = `${caption}\n\n${tags}`.trim();

  return caption.slice(0, 2200);
}

async function publishPlatform(
  platform: SocialPlatform,
  caption: string,
  media: { imageUrl?: string; videoUrl?: string },
  creds: Awaited<ReturnType<typeof getSocialCredentials>>,
  post: Record<string, unknown>,
  product: Record<string, unknown> | null
): Promise<PlatformPublishResult> {
  if (!creds) {
    return { ok: false, error: `No connected ${platform} account. Connect it on the Social page.` };
  }

  try {
    if (platform === 'instagram') {
      const igId = creds.metadata.igBusinessAccountId as string;
      if (!igId) return { ok: false, error: 'Instagram Business account ID missing — reconnect Instagram.' };
      if (!media.imageUrl) {
        return { ok: false, error: 'Instagram requires a public image URL (use product images or http(s) media).' };
      }
      const result = await publishToInstagram({
        caption,
        imageUrl: media.imageUrl,
        igBusinessAccountId: igId,
        pageAccessToken: creds.accessToken,
      });
      return { ok: true, platformPostId: result.platformPostId, platformPostUrl: result.platformPostUrl };
    }

    if (platform === 'facebook') {
      const pageId = creds.metadata.pageId as string;
      if (!pageId) return { ok: false, error: 'Facebook Page ID missing — reconnect Facebook.' };
      const result = await publishToFacebookPage({
        caption,
        imageUrl: media.imageUrl,
        pageId,
        pageAccessToken: creds.accessToken,
      });
      return { ok: true, platformPostId: result.platformPostId, platformPostUrl: result.platformPostUrl };
    }

    if (platform === 'youtube') {
      if (!media.videoUrl) {
        return {
          ok: false,
          error:
            'YouTube requires a video. Upload a video in Studio or provide a direct https URL to an .mp4 file.',
        };
      }
      const youtubePrivacy = post.youtubePrivacy as 'public' | 'unlisted' | 'private' | undefined;
      const result = await publishToYouTube({
        accessToken: creds.accessToken,
        refreshToken: creds.refreshToken,
        accountId: creds.accountId,
        title: buildYouTubeTitle(caption, product, post.headline as string | undefined),
        description: caption,
        videoUrl: media.videoUrl,
        privacyStatus: youtubePrivacy,
      });
      return {
        ok: true,
        platformPostId: result.platformPostId,
        platformPostUrl: result.platformPostUrl,
      };
    }

    if (platform === 'whatsapp') {
      const tenant = await db.get('tenants', post.tenantId as string);
      const recipients = parseWhatsAppRecipients(
        (tenant?.whatsappPublishRecipients as string) ||
          (creds.metadata.publishRecipients as string)
      );
      const phoneNumberId = (creds.metadata.phoneNumberId as string) || creds.accountId;
      const linkUrl =
        (product?.publicUrl as string) ||
        (post.productUrl as string) ||
        undefined;

      const result = await publishToWhatsAppBusiness({
        accessToken: creds.accessToken,
        phoneNumberId,
        caption,
        imageUrl: media.imageUrl,
        linkUrl,
        recipients,
        displayPhoneNumber: creds.metadata.displayPhoneNumber as string | undefined,
      });
      return {
        ok: true,
        platformPostId: result.platformPostId,
        platformPostUrl: result.platformPostUrl,
      };
    }

    return { ok: false, error: `Unsupported platform: ${platform}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Publish failed' };
  }
}

/** Execute publish for a scheduled post via direct platform APIs. */
export async function executeScheduledPost(postId: string): Promise<{
  status: string;
  results: Record<string, PlatformPublishResult>;
}> {
  if (processing.has(postId)) {
    return { status: 'processing', results: {} };
  }

  const post = await db.get('scheduled_posts', postId);
  if (!post) throw new Error('Scheduled post not found');
  if (post.status === 'published' || post.status === 'cancelled') {
    return { status: post.status as string, results: (post.publishResults as Record<string, PlatformPublishResult>) || {} };
  }

  processing.add(postId);
  const now = new Date().toISOString();

  try {
    await db.update('scheduled_posts', postId, { status: 'processing', updatedAt: now });

    const product = post.productId ? await db.get('products', post.productId as string) : null;
    const caption = await buildCaption(post, product);
    const imageUrls = collectImageUrls(post, product);
    const videoUrls = collectVideoUrls(post);
    const imageUrl = imageUrls[0];
    const videoUrl = videoUrls[0];

    const platforms = (post.platforms as SocialPlatform[]) || [];
    const needsCaption = platforms.some((p) => p !== 'youtube' || !videoUrl);
    if (needsCaption && !caption) {
      throw new Error('No caption available. Add copy in Studio or enable AI caption.');
    }

    const results: Record<string, PlatformPublishResult> = {};

    for (const platform of platforms) {
      const creds = await getSocialCredentials(post.tenantId as string, platform);
      results[platform] = await publishPlatform(
        platform,
        caption || buildYouTubeTitle('', product, post.headline as string | undefined),
        { imageUrl, videoUrl },
        creds,
        post,
        product
      );
    }

    const values = Object.values(results);
    const anyOk = values.some((r) => r.ok);
    const allOk = values.length > 0 && values.every((r) => r.ok);
    const status = allOk ? 'published' : anyOk ? 'published' : 'failed';
    const errors = values.filter((r) => !r.ok).map((r) => r.error).filter(Boolean);

    await db.update('scheduled_posts', postId, {
      status,
      caption,
      mediaUrls: [...imageUrls, ...videoUrls],
      publishResults: results,
      publishedAt: anyOk ? now : null,
      publishError: errors.length ? errors.join('; ') : null,
      updatedAt: now,
    });

    return { status, results };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed';
    await db.update('scheduled_posts', postId, {
      status: 'failed',
      publishError: message,
      updatedAt: now,
    });
    throw err;
  } finally {
    processing.delete(postId);
  }
}

export async function processDueScheduledPosts(limit = 20): Promise<number> {
  const now = new Date().toISOString();
  const posts = await db.query('scheduled_posts', {
    filters: [
      { field: 'status', op: '==', value: 'pending' },
      { field: 'scheduledAt', op: '<=', value: now },
    ],
    limit,
  });

  let ran = 0;
  for (const post of posts) {
    try {
      await executeScheduledPost(post.id as string);
      ran++;
    } catch (err) {
      console.warn(`[publish] ${post.id} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return ran;
}

export function enqueueScheduledPost(postId: string, scheduledAt: string): void {
  const delay = new Date(scheduledAt).getTime() - Date.now();
  if (delay <= 5000) {
    void executeScheduledPost(postId).catch((err) =>
      console.warn(`[publish] immediate ${postId}:`, err instanceof Error ? err.message : err)
    );
  }
}
