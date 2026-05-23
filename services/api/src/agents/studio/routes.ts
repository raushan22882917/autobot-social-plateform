import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { uploadStudioMediaFile } from '../../lib/studio-media-storage';
import type { AuthRequest } from '../../middleware/auth';
import { generateStudioPost, isGeminiConfigured, testGeminiConnection } from '../../lib/gemini';
import {
  getHitem3DAccessToken,
  isHitem3DConfigured,
  testHitem3DConnection,
} from '../../lib/hitem3d';
import { enhanceGeminiImage, generateGeminiImage, generateVeoVideo, getGeminiMediaConfig } from '../../lib/gemini-media';
import { convertImageTo3D } from '../../lib/hitem3d-media';
import { publishEvent } from '../../lib/pubsub';
import { PubSubTopics } from '@autobot360/shared';
import { enqueueScheduledPost } from '../publish/publish-executor';

export const studioRouter = Router();

type StudioMediaItem = { type?: string; url: string; name?: string };

/** Firestore and social APIs need small docs with public https URLs — never store base64 data URLs. */
function sanitizeStudioMedia(media: unknown): StudioMediaItem[] {
  if (!Array.isArray(media)) return [];
  return media
    .filter(
      (m): m is StudioMediaItem =>
        Boolean(m && typeof m === 'object' && typeof (m as StudioMediaItem).url === 'string')
    )
    .filter((m) => /^https?:\/\//i.test(m.url))
    .map((m) => ({
      type: m.type === 'video' ? 'video' : m.type === 'model' ? 'model' : 'image',
      url: m.url,
      ...(m.name ? { name: m.name } : {}),
    }));
}

function sanitizeMediaUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return [...new Set(urls.filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u)))];
}

const studioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || '').toLowerCase();
    const okMime = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    const okExt = /\.(jpe?g|png|gif|webp|mp4|mov|webm|m4v)$/i.test(ext);
    if (okMime || okExt) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed (jpg, png, webp, mp4, mov, webm)'));
    }
  },
});

studioRouter.post('/media/upload', studioUpload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded' } });
    }
    const uploaded = await uploadStudioMediaFile(
      req.user!.tenantId,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );
    res.status(201).json({
      media: {
        type: uploaded.type,
        url: uploaded.url,
        name: req.file.originalname,
      },
    });
  } catch (err) {
    next(err);
  }
});

studioRouter.get('/config', (_req, res) => {
  const media = getGeminiMediaConfig();
  res.json({
    gemini: isGeminiConfigured(),
    hitem3d: isHitem3DConfigured(),
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    imageModel: media.imageModel,
    veoModel: media.veoModel,
    features: {
      imageGenerate: media.configured,
      imageEnhance: media.configured,
      videoGenerate: media.configured,
      imageTo3d: isHitem3DConfigured(),
    },
  });
});

studioRouter.get('/test-connections', async (_req, res, next) => {
  try {
    const [gemini, hitem3d] = await Promise.all([
      isGeminiConfigured() ? testGeminiConnection() : Promise.resolve({ ok: false, message: 'Not configured' }),
      isHitem3DConfigured() ? testHitem3DConnection() : Promise.resolve({ ok: false, message: 'Not configured' }),
    ]);
    res.json({ gemini, hitem3d });
  } catch (err) {
    next(err);
  }
});

studioRouter.post('/hitem3d/token', async (_req: AuthRequest, res, next) => {
  try {
    const token = await getHitem3DAccessToken();
    res.json({
      connected: true,
      tokenType: token.tokenType,
      nonce: token.nonce,
      expiresHint: 'Token cached server-side for ~50 minutes',
    });
  } catch (err) {
    next(err);
  }
});

studioRouter.post('/media/enhance-image', async (req: AuthRequest, res, next) => {
  try {
    const { imageUrl, prompt } = req.body as { imageUrl?: string; prompt?: string };
    if (!imageUrl) return res.status(400).json({ error: { message: 'imageUrl is required' } });
    const media = await enhanceGeminiImage(req.user!.tenantId, imageUrl, prompt || '');
    res.json({ media });
  } catch (err) {
    next(err);
  }
});

studioRouter.post('/media/generate-image', async (req: AuthRequest, res, next) => {
  try {
    const { prompt, aspectRatio } = req.body as { prompt?: string; aspectRatio?: string };
    if (!prompt?.trim()) return res.status(400).json({ error: { message: 'prompt is required' } });
    const media = await generateGeminiImage(req.user!.tenantId, prompt.trim(), aspectRatio || '1:1');
    res.json({ media });
  } catch (err) {
    next(err);
  }
});

studioRouter.post('/media/generate-video', async (req: AuthRequest, res, next) => {
  try {
    const { prompt, imageUrl, aspectRatio } = req.body as {
      prompt?: string;
      imageUrl?: string;
      aspectRatio?: string;
    };
    if (!prompt?.trim()) return res.status(400).json({ error: { message: 'prompt is required' } });
    const media = await generateVeoVideo(req.user!.tenantId, prompt.trim(), { imageUrl, aspectRatio });
    res.json({ media });
  } catch (err) {
    next(err);
  }
});

studioRouter.post('/media/image-to-3d', async (req: AuthRequest, res, next) => {
  try {
    const { imageUrl } = req.body as { imageUrl?: string };
    if (!imageUrl) return res.status(400).json({ error: { message: 'imageUrl is required' } });
    const result = await convertImageTo3D(req.user!.tenantId, imageUrl);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

studioRouter.post('/generate', async (req: AuthRequest, res, next) => {
  try {
    const {
      productId,
      platforms = ['instagram'],
      tone,
      customPrompt,
      mediaUrls = [],
    } = req.body;

    let productTitle = req.body.productTitle || 'Product';
    let productDescription = req.body.productDescription || '';
    let price = req.body.price;
    const imageUrls: string[] = [...sanitizeMediaUrls(mediaUrls)];

    if (productId) {
      const product = await db.get('products', productId);
      if (!product || product.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: { message: 'Product not found' } });
      }
      productTitle = product.title as string;
      productDescription = (product.description as string) || '';
      price = product.price as number;
      const imgs = (product.images as { url: string }[]) || [];
      imageUrls.push(...imgs.map((i) => i.url).filter(Boolean));
    }

    const result = await generateStudioPost({
      productTitle,
      productDescription,
      price,
      currency: 'INR',
      platforms,
      tone,
      customPrompt,
      imageUrls: [...new Set(imageUrls)].slice(0, 4),
    });

    res.json({ generated: result });
  } catch (err) {
    next(err);
  }
});

studioRouter.get('/drafts', async (req: AuthRequest, res, next) => {
  try {
    const drafts = await db.query('studio_drafts', {
      filters: [{ field: 'tenantId', op: '==', value: req.user!.tenantId }],
      orderBy: { field: 'updatedAt', direction: 'desc' },
      limit: 20,
    });
    res.json({ drafts });
  } catch (err) {
    next(err);
  }
});

studioRouter.post('/drafts', async (req: AuthRequest, res, next) => {
  try {
    const id = `draft_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const draft = {
      id,
      tenantId: req.user!.tenantId,
      createdBy: req.user!.uid,
      productId: req.body.productId || null,
      platforms: req.body.platforms || ['instagram'],
      caption: req.body.caption || '',
      hashtags: req.body.hashtags || [],
      cta: req.body.cta || '',
      headline: req.body.headline || '',
      media: sanitizeStudioMedia(req.body.media),
      platformVariants: req.body.platformVariants || {},
      tone: req.body.tone || 'engaging',
      contentFormat: ['post', 'reel', 'story'].includes(req.body.contentFormat)
        ? req.body.contentFormat
        : 'post',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    await db.set('studio_drafts', id, draft);
    res.status(201).json({ draft });
  } catch (err) {
    next(err);
  }
});

studioRouter.post('/drafts/:id/schedule', async (req: AuthRequest, res, next) => {
  try {
    const draft = await db.get('studio_drafts', req.params.id);
    if (!draft || draft.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Draft not found' } });
    }

    const scheduledAt = req.body.publishNow
      ? new Date().toISOString()
      : req.body.scheduledAt || new Date(Date.now() + 3600000).toISOString();
    const postId = `sp_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const media = (draft.media as { url: string; type?: string }[]) || [];
    const mediaUrls = media
      .filter((m) => m.url && /^https?:\/\//i.test(m.url))
      .map((m) => m.url);

    const youtubePrivacy = ['private', 'unlisted', 'public'].includes(req.body.youtubePrivacy)
      ? req.body.youtubePrivacy
      : 'unlisted';

    const scheduledPost = {
      id: postId,
      tenantId: req.user!.tenantId,
      productId: draft.productId,
      productTitle: draft.headline || draft.caption,
      caption: draft.caption,
      hashtags: draft.hashtags,
      platforms: draft.platforms,
      media: draft.media,
      mediaUrls,
      youtubePrivacy: (draft.platforms as string[])?.includes('youtube') ? youtubePrivacy : undefined,
      scheduledAt,
      status: 'pending',
      useAiCaption: false,
      source: 'studio',
      contentFormat: ['post', 'reel', 'story'].includes(draft.contentFormat as string)
        ? draft.contentFormat
        : 'post',
      studioDraftId: draft.id,
      socialAccountIds: req.body.socialAccountIds || [],
      idempotencyKey: `publish_${postId}_v1`,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: req.user!.uid,
    };

    await db.set('scheduled_posts', postId, scheduledPost);
    await db.update('studio_drafts', req.params.id, { status: 'scheduled', scheduledPostId: postId, updatedAt: now });

    if (req.body.publishNow) {
      // Client calls POST /publish/now/:id — avoid double publish from pubsub enqueue
    } else {
      await publishEvent(PubSubTopics.PUBLISH_REQUESTED, {
        eventType: 'publish.requested',
        tenantId: req.user!.tenantId,
        userId: req.user!.uid,
        idempotencyKey: `publish_${postId}`,
        payload: { scheduledPostId: postId, productId: draft.productId, platforms: draft.platforms, scheduledAt },
        metadata: { source: 'studio' },
      });
      enqueueScheduledPost(postId, scheduledAt);
    }

    res.status(201).json({ scheduledPost });
  } catch (err) {
    next(err);
  }
});
