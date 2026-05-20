import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { db } from '../../lib/db';
import { analyzePostComments, buildPurchaseAssistFlow } from '../../lib/gemini-social';
import { enrichScheduledPost, loadPostEngagement } from './post-engagement';
import {
  replyToFacebookComment,
  replyToInstagramComment,
} from './platforms/meta-engagement';
import { replyToYouTubeComment } from './platforms/youtube-engagement';
import { getSocialCredentials } from '../social-connect/token-store';
import type { SocialPlatform } from '../social-connect/config';

export const postDetailRouter = Router();

postDetailRouter.get('/scheduled/:id', async (req: AuthRequest, res, next) => {
  try {
    const post = await db.get('scheduled_posts', req.params.id);
    if (!post || post.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Post not found' } });
    }
    res.json({ post: await enrichScheduledPost(post) });
  } catch (err) {
    next(err);
  }
});

postDetailRouter.get('/scheduled/:id/engagement', async (req: AuthRequest, res, next) => {
  try {
    const post = await db.get('scheduled_posts', req.params.id);
    if (!post || post.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Post not found' } });
    }
    const engagement = await loadPostEngagement(req.user!.tenantId, post);
    res.json(engagement);
  } catch (err) {
    next(err);
  }
});

postDetailRouter.post('/scheduled/:id/ai/analyze-comments', requireRole('owner', 'admin', 'editor'), async (req: AuthRequest, res, next) => {
  try {
    const post = await db.get('scheduled_posts', req.params.id);
    if (!post || post.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Post not found' } });
    }

    const engagement = await loadPostEngagement(req.user!.tenantId, post);
    const allComments = engagement.platforms.flatMap((p) => p.comments);
    const product = post.productId ? await db.get('products', post.productId as string) : null;

    const analysis = await analyzePostComments({
      productTitle: (post.productTitle as string) || (product?.title as string) || 'Product',
      productPrice: product?.price as number | undefined,
      caption: (post.caption as string) || '',
      comments: allComments,
    });

    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
    const checkoutPath = product?.id
      ? `${publicUrl}/p/${(product.slug as string) || 'product'}?id=${product.id}`
      : publicUrl;

    const insights = analysis.insights.map((ins) => ({
      ...ins,
      suggestedReply: ins.suggestedReply.replace(/\{\{CHECKOUT_LINK\}\}/g, checkoutPath),
    }));

    const now = new Date().toISOString();
    await db.update('scheduled_posts', req.params.id, {
      lastCommentAnalysis: { ...analysis, insights, analyzedAt: now },
      updatedAt: now,
    });

    res.json({ analysis: { ...analysis, insights }, engagement: engagement.totals });
  } catch (err) {
    next(err);
  }
});

postDetailRouter.post('/scheduled/:id/ai/purchase-assist', requireRole('owner', 'admin', 'editor'), async (req: AuthRequest, res, next) => {
  try {
    const post = await db.get('scheduled_posts', req.params.id);
    if (!post || post.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Post not found' } });
    }
    if (!post.productId) {
      return res.status(400).json({ error: { message: 'Link a product to this post first' } });
    }

    const product = await db.get('products', post.productId as string);
    if (!product) return res.status(404).json({ error: { message: 'Product not found' } });

    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
    let checkoutUrl = `${publicUrl}/p/${(product.slug as string) || 'product'}?id=${product.id}`;

    if (req.body.createCheckout) {
      const subtotal = (product.price as number) * (req.body.quantity || 1);
      const tax = Math.round(subtotal * 0.18);
      const sessionId = `cs_${uuidv4().slice(0, 8)}`;
      const now = new Date().toISOString();
      await db.set('checkout_sessions', sessionId, {
        id: sessionId,
        tenantId: post.tenantId,
        productId: product.id,
        quantity: req.body.quantity || 1,
        items: [{ productId: product.id, title: product.title, quantity: 1, price: product.price, total: subtotal }],
        subtotal,
        tax,
        shipping: 0,
        discount: 0,
        total: subtotal + tax,
        currency: 'INR',
        status: 'open',
        expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
        createdAt: now,
        source: 'post_ai_assist',
        scheduledPostId: post.id,
      });
      checkoutUrl = `${publicUrl}/checkout/${sessionId}`;
    }

    const assist = await buildPurchaseAssistFlow({
      productTitle: product.title as string,
      productDescription: product.description as string,
      price: product.price as number,
      customerMessage: req.body.customerMessage || 'I want to buy this',
      checkoutUrl,
    });

    res.json({ assist, checkoutUrl, product: { id: product.id, title: product.title, price: product.price } });
  } catch (err) {
    next(err);
  }
});

postDetailRouter.post('/scheduled/:id/comments/reply', requireRole('owner', 'admin', 'editor'), async (req: AuthRequest, res, next) => {
  try {
    const { commentId, platform, message } = req.body as {
      commentId?: string;
      platform?: string;
      message?: string;
    };
    if (!commentId || !platform || !message?.trim()) {
      return res.status(400).json({ error: { message: 'commentId, platform, and message required' } });
    }

    const post = await db.get('scheduled_posts', req.params.id);
    if (!post || post.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Post not found' } });
    }

    const creds = await getSocialCredentials(req.user!.tenantId, platform as SocialPlatform);
    if (!creds) {
      return res.status(400).json({ error: { message: `${platform} not connected` } });
    }

    if (platform === 'instagram') {
      await replyToInstagramComment(commentId, message, creds.accessToken);
    } else if (platform === 'facebook') {
      await replyToFacebookComment(commentId, message, creds.accessToken);
    } else if (platform === 'youtube') {
      await replyToYouTubeComment(commentId, message, creds);
    } else {
      return res.status(400).json({ error: { message: 'Auto-reply supported for Instagram, Facebook, and YouTube' } });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
