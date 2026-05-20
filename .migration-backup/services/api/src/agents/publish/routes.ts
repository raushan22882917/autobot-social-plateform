import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { schedulePostSchema } from '@autobot360/shared';
import { db } from '../../lib/db';
import { publishEvent } from '../../lib/pubsub';
import { PubSubTopics } from '@autobot360/shared';
import type { AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { executeScheduledPost, enqueueScheduledPost } from './publish-executor';
import { getSocialCredentials } from '../social-connect/token-store';
import { updateYouTubeVideoPrivacy } from './platforms/youtube-publish';
import { postDetailRouter } from './post-detail-routes';

export const publishRouter = Router();
publishRouter.use(postDetailRouter);

publishRouter.get('/scheduled', async (req: AuthRequest, res, next) => {
  try {
    const posts = await db.query('scheduled_posts', {
      filters: [{ field: 'tenantId', op: '==', value: req.user!.tenantId }],
      orderBy: { field: 'scheduledAt', direction: 'desc' },
      limit: 50,
    });

    const enriched = await Promise.all(
      posts.map(async (post) => {
        if (post.productTitle) return post;
        const productId = post.productId as string | undefined;
        if (!productId) {
          return { ...post, productTitle: post.headline || 'Studio post' };
        }
        try {
          const product = await db.get('products', productId);
          return { ...post, productTitle: product?.title || post.headline || 'Unknown product' };
        } catch {
          return { ...post, productTitle: post.headline || 'Unknown product' };
        }
      })
    );

    res.json({ posts: enriched });
  } catch (err) {
    next(err);
  }
});

publishRouter.post('/schedule', requireRole('owner', 'admin', 'editor'), validate(schedulePostSchema), async (req: AuthRequest, res, next) => {
  try {
    const parsed = req.body;
    const product = await db.get('products', parsed.productId);
    if (!product || product.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    const id = `sp_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const scheduledPost = {
      id,
      tenantId: req.user!.tenantId,
      productId: parsed.productId,
      platforms: parsed.platforms,
      socialAccountIds: parsed.socialAccountIds || [],
      caption: parsed.caption || null,
      useAiCaption: parsed.useAiCaption ?? true,
      hashtags: parsed.hashtags || [],
      mediaUrls: (product.images as { url: string }[])?.map((i) => i.url) || [],
      youtubePrivacy:
        parsed.platforms.includes('youtube') ? parsed.youtubePrivacy || 'unlisted' : undefined,
      scheduledAt: parsed.scheduledAt,
      timezone: parsed.timezone || 'Asia/Kolkata',
      status: 'pending',
      retryCount: 0,
      idempotencyKey: `publish_${id}_v1`,
      createdAt: now,
      updatedAt: now,
      createdBy: req.user!.uid,
    };

    await db.set('scheduled_posts', id, scheduledPost);

    await publishEvent(PubSubTopics.PUBLISH_REQUESTED, {
      eventType: 'publish.requested',
      tenantId: req.user!.tenantId,
      userId: req.user!.uid,
      idempotencyKey: scheduledPost.idempotencyKey,
      payload: {
        scheduledPostId: id,
        productId: parsed.productId,
        platforms: parsed.platforms,
        socialAccountIds: parsed.socialAccountIds || [],
        useAiCaption: parsed.useAiCaption,
        scheduledAt: parsed.scheduledAt,
      },
      metadata: { source: 'publish-agent' },
    });

    enqueueScheduledPost(id, parsed.scheduledAt);

    res.status(201).json(scheduledPost);
  } catch (err) {
    next(err);
  }
});

publishRouter.post('/now/:id', requireRole('owner', 'admin', 'editor'), async (req: AuthRequest, res, next) => {
  try {
    const post = await db.get('scheduled_posts', req.params.id);
    if (!post || post.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Post not found' } });
    }

    await db.update('scheduled_posts', req.params.id, {
      scheduledAt: new Date().toISOString(),
      status: 'processing',
      updatedAt: new Date().toISOString(),
    });

    const result = await executeScheduledPost(req.params.id);

    res.json({
      success: result.status === 'published',
      status: result.status,
      results: result.results,
      message:
        result.status === 'published'
          ? 'Published to social platforms'
          : 'Publish completed with errors — see results',
    });
  } catch (err) {
    next(err);
  }
});

publishRouter.patch(
  '/scheduled/:id/youtube-privacy',
  requireRole('owner', 'admin', 'editor'),
  async (req: AuthRequest, res, next) => {
    try {
      const privacy = req.body.privacy as string;
      if (!['private', 'unlisted', 'public'].includes(privacy)) {
        return res.status(400).json({ error: { message: 'privacy must be private, unlisted, or public' } });
      }

      const post = await db.get('scheduled_posts', req.params.id);
      if (!post || post.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: { message: 'Post not found' } });
      }

      const platforms = (post.platforms as string[]) || [];
      if (!platforms.includes('youtube')) {
        return res.status(400).json({ error: { message: 'This post was not published to YouTube' } });
      }

      const results = (post.publishResults as Record<string, { platformPostId?: string }>) || {};
      const videoId = results.youtube?.platformPostId;

      if (videoId) {
        const creds = await getSocialCredentials(post.tenantId as string, 'youtube');
        if (!creds) {
          return res.status(400).json({ error: { message: 'YouTube account not connected' } });
        }
        await updateYouTubeVideoPrivacy({
          videoId,
          accessToken: creds.accessToken,
          refreshToken: creds.refreshToken,
          privacyStatus: privacy as 'public' | 'unlisted' | 'private',
        });
      }

      const now = new Date().toISOString();
      await db.update('scheduled_posts', req.params.id, {
        youtubePrivacy: privacy,
        updatedAt: now,
      });

      res.json({ success: true, youtubePrivacy: privacy });
    } catch (err) {
      next(err);
    }
  }
);

publishRouter.delete('/scheduled/:id', requireRole('owner', 'admin', 'editor'), async (req: AuthRequest, res, next) => {
  try {
    const post = await db.get('scheduled_posts', req.params.id);
    if (!post || post.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Post not found' } });
    }
    await db.update('scheduled_posts', req.params.id, { status: 'cancelled', updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
