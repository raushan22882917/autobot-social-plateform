import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import type { AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { loadPostEngagement } from '../publish/post-engagement';
import { analyzePostComments, buildPurchaseAssistFlow } from '../../lib/gemini-social';
import {
  replyToFacebookComment,
  replyToInstagramComment,
} from '../publish/platforms/meta-engagement';
import { replyToYouTubeComment } from '../publish/platforms/youtube-engagement';
import { getSocialCredentials } from '../social-connect/token-store';
import type { SocialPlatform } from '../social-connect/config';
import {
  getAnalysisHistory,
  getCommentReplyRecords,
  getLatestAnalysisRun,
  saveAnalysisRun,
  upsertCommentReplyRecord,
} from './product-analysis-store';

export const productAnalysisRouter = Router({ mergeParams: true });

export interface ProductCommentRow {
  commentId: string;
  postId: string;
  author: string;
  text: string;
  platform: string;
  timestamp?: string;
  likeCount?: number;
  parentCommentId?: string;
  parentAuthor?: string;
  isReply?: boolean;
}

export type { ReplyStatus } from './product-analysis-store';
import type { ReplyStatus, ProductCommentReplyRecord } from './product-analysis-store';

/** Comments we already replied to (same comment text = skip; new text or new id = allow reply) */
function buildRepliedMemory(records: ProductCommentReplyRecord[]) {
  const map = new Map<string, { commentText: string; replyText: string; platform: string }>();
  for (const r of records) {
    if (!r.replyStatus?.sent || r.replyStatus.skipped) continue;
    map.set(r.commentId, {
      commentText: (r.commentText || '').trim(),
      replyText: r.replyStatus.replyText || r.suggestedReply || '',
      platform: r.platform,
    });
  }
  return map;
}

async function sendCommentOnPlatform(
  tenantId: string,
  platform: string,
  commentId: string,
  message: string
): Promise<ReplyStatus> {
  const p = platform.toLowerCase();
  if (p !== 'instagram' && p !== 'facebook' && p !== 'youtube') {
    return {
      sent: false,
      platform: p,
      error: `Auto-reply is not supported for ${platform}`,
    };
  }

  const creds = await getSocialCredentials(tenantId, p as SocialPlatform);
  if (!creds) {
    return { sent: false, platform: p, error: `${platform} is not connected` };
  }

  try {
    if (p === 'instagram') {
      await replyToInstagramComment(commentId, message, creds.accessToken);
    } else if (p === 'facebook') {
      await replyToFacebookComment(commentId, message, creds.accessToken);
    } else {
      await replyToYouTubeComment(commentId, message, creds);
    }
    return { sent: true, platform: p, replyText: message };
  } catch (err) {
    return {
      sent: false,
      platform: p,
      error: err instanceof Error ? err.message : 'Failed to send reply',
    };
  }
}

async function autoReplyToInsight(
  tenantId: string,
  product: Record<string, unknown>,
  insight: {
    commentId: string;
    intent: string;
    shouldReply: boolean;
    suggestedReply: string;
    platform?: string;
    text?: string;
    replyStatus?: ReplyStatus | null;
  },
  comments: ProductCommentRow[],
  repliedMemory: Map<string, { commentText: string; replyText: string; platform: string }>
): Promise<ReplyStatus | null> {
  if (!insight.shouldReply) return null;

  const row = comments.find((c) => c.commentId === insight.commentId);
  const platform = (insight.platform || row?.platform || '').toLowerCase();
  const commentId = insight.commentId;
  const currentText = (insight.text || row?.text || '').trim();

  if (!platform || !commentId) {
    return { sent: false, platform: platform || 'unknown', error: 'Missing platform or comment id' };
  }

  const prior = repliedMemory.get(commentId);
  if (prior && (!prior.commentText || prior.commentText === currentText)) {
    return {
      sent: true,
      skipped: true,
      platform: prior.platform || platform,
      replyText: prior.replyText,
    };
  }

  try {
    let replyText = insight.suggestedReply;
    let checkoutUrl: string | undefined;

    if (insight.intent === 'purchase') {
      const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
      const subtotal = (product.price as number) * 1;
      const tax = Math.round(subtotal * 0.18);
      const sessionId = `cs_${uuidv4().slice(0, 8)}`;
      const now = new Date().toISOString();
      await db.set('checkout_sessions', sessionId, {
        id: sessionId,
        tenantId,
        productId: product.id,
        quantity: 1,
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
        source: 'product_analysis_auto',
      });
      checkoutUrl = `${publicUrl}/checkout/${sessionId}`;

      const assist = await buildPurchaseAssistFlow({
        productTitle: product.title as string,
        productDescription: product.description as string,
        price: product.price as number,
        customerMessage: currentText || 'I want to buy',
        checkoutUrl,
      });
      replyText = assist.suggestedReply.includes('http')
        ? assist.suggestedReply
        : `${assist.suggestedReply} ${checkoutUrl}`.trim();
    }

    if (!replyText?.trim()) {
      return { sent: false, platform, error: 'No reply text generated' };
    }

    const status = await sendCommentOnPlatform(tenantId, platform, commentId, replyText.trim());
    if (checkoutUrl) status.checkoutUrl = checkoutUrl;

    if (status.sent) {
      repliedMemory.set(commentId, {
        commentText: currentText,
        replyText: status.replyText || replyText.trim(),
        platform,
      });
    }

    return status;
  } catch (err) {
    return {
      sent: false,
      platform,
      error: err instanceof Error ? err.message : 'Auto-reply failed',
    };
  }
}

async function loadProductComments(
  tenantId: string,
  productId: string
): Promise<{ comments: ProductCommentRow[]; posts: Record<string, unknown>[] }> {
  const posts = await db.query('scheduled_posts', {
    filters: [
      { field: 'tenantId', op: '==', value: tenantId },
      { field: 'productId', op: '==', value: productId },
    ],
    orderBy: { field: 'scheduledAt', direction: 'desc' },
    limit: 30,
  });

  const comments: ProductCommentRow[] = [];

  for (const post of posts) {
    const results = post.publishResults as Record<string, { ok?: boolean }> | undefined;
    const isPublished =
      post.status === 'published' || Boolean(results && Object.values(results).some((r) => r.ok));
    if (!isPublished) continue;

    try {
      const eng = await loadPostEngagement(tenantId, post);
      for (const p of eng.platforms) {
        for (const c of p.comments) {
          comments.push({
            commentId: c.id,
            postId: post.id as string,
            author: c.author,
            text: c.text,
            platform: c.platform,
            timestamp: c.timestamp,
            likeCount: c.likeCount,
            parentCommentId: c.parentCommentId,
            parentAuthor: c.parentAuthor,
            isReply: c.isReply,
          });
        }
      }
    } catch {
      /* skip post if engagement fails */
    }
  }

  return { comments, posts };
}

productAnalysisRouter.get('/:productId/analysis', async (req: AuthRequest, res, next) => {
  try {
    const product = await db.get('products', req.params.productId);
    if (!product || product.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    const { comments, posts } = await loadProductComments(req.user!.tenantId, req.params.productId);

    const publishedPosts = posts.filter((p) => {
      const results = p.publishResults as Record<string, { ok?: boolean }> | undefined;
      return p.status === 'published' || (results && Object.values(results).some((r) => r.ok));
    });

    const platformCounts: Record<string, number> = {};
    for (const c of comments) {
      const p = (c.platform || 'unknown').toLowerCase();
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    }

    const tenantId = req.user!.tenantId;
    const productId = req.params.productId;
    const [savedAnalysis, commentRecords, analysisHistory] = await Promise.all([
      getLatestAnalysisRun(tenantId, productId),
      getCommentReplyRecords(tenantId, productId),
      getAnalysisHistory(tenantId, productId, 20),
    ]);

    const latestRun = savedAnalysis || analysisHistory[0];

    res.json({
      product: {
        id: product.id,
        title: product.title,
        price: product.price,
        description: product.description,
        publicUrl: product.publicUrl,
        images: product.images,
        lastAnalyzedAt: product.lastAnalyzedAt,
      },
      stats: {
        totalPosts: posts.length,
        publishedPosts: publishedPosts.length,
        totalComments: comments.length,
        platformCounts,
        savedReplies: commentRecords.filter((r) => r.replyStatus?.sent).length,
      },
      comments,
      savedAnalysis: latestRun,
      productReception: latestRun?.productReception,
      commentRecords,
      analysisHistory: analysisHistory.map((r) => ({
        id: r.id,
        analyzedAt: r.analyzedAt,
        autoReplied: r.autoReplied,
        purchaseLeads: r.purchaseLeads,
        totalComments: r.totalComments,
        summary: r.summary,
        productReception: r.productReception,
        commentCount: r.allComments?.length ?? r.insights?.length ?? 0,
      })),
      posts: publishedPosts.map((p) => ({
        id: p.id,
        status: p.status,
        platforms: p.platforms,
        scheduledAt: p.scheduledAt,
        publishResults: p.publishResults,
      })),
    });
  } catch (err) {
    next(err);
  }
});

productAnalysisRouter.post('/:productId/analyze', requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const autoReply = req.body?.autoReply !== false;

    const product = await db.get('products', req.params.productId);
    if (!product || product.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    const tenantId = req.user!.tenantId;
    const { comments } = await loadProductComments(tenantId, req.params.productId);

    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
    const checkoutPath = `${publicUrl}/p/${(product.slug as string) || 'product'}?id=${product.id}`;

    const productId = String(req.params.productId);
    const existingRecords = await getCommentReplyRecords(tenantId, productId);
    const repliedMemory = buildRepliedMemory(existingRecords);

    let analysis;
    try {
      analysis = await analyzePostComments({
      productTitle: product.title as string,
      productPrice: product.price as number,
      caption: (product.description as string) || '',
      comments: comments.map((c) => ({
        id: c.commentId,
        text: c.text,
        author: c.author,
        platform: c.platform,
        parentCommentId: c.parentCommentId,
        parentAuthor: c.parentAuthor,
        isReply: c.isReply,
      })),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI analysis failed';
      return res.status(502).json({ error: { message: msg } });
    }

    const insightByCommentId = new Map(analysis.insights.map((i) => [i.commentId, i]));

    const paymentAskPattern =
      /payment|pay\s*link|checkout|buy\s*link|purchase\s*link|send\s*link|how\s*to\s*buy|cost|price|order/i;

    for (const c of comments) {
      const text = c.text || '';
      const wantsPayment = paymentAskPattern.test(text);
      let ins = insightByCommentId.get(c.commentId);

      if (!ins) {
        ins = {
          commentId: c.commentId,
          intent: wantsPayment ? 'purchase' : 'other',
          sentiment: 'neutral',
          productFit: 'uncertain',
          shouldReply: wantsPayment,
          priority: wantsPayment ? 'high' : 'low',
          suggestedReply: wantsPayment
            ? 'Thanks for asking! You can order here: {{CHECKOUT_LINK}}'
            : '',
          reason: 'Detected from comment text',
        };
        insightByCommentId.set(c.commentId, ins);
        analysis.insights.push(ins);
        continue;
      }

      if (wantsPayment && (c.isReply || ins.intent === 'question' || ins.intent === 'other' || ins.intent === 'purchase')) {
        ins.shouldReply = true;
        ins.priority = 'high';
        if (ins.intent === 'other' || ins.intent === 'question') {
          ins.intent = 'purchase';
        }
        if (!ins.suggestedReply?.trim()) {
          ins.suggestedReply = 'Thanks for asking! You can order here: {{CHECKOUT_LINK}}';
        }
      }
    }

    const insights = await Promise.all(
      comments.map(async (row) => {
        const ins = insightByCommentId.get(row.commentId);
        const enriched = {
          commentId: row.commentId,
          postId: row.postId,
          author: row.author,
          text: row.text,
          platform: row.platform,
          parentCommentId: row.parentCommentId,
          parentAuthor: row.parentAuthor,
          isReply: row.isReply,
          intent: ins?.intent || 'other',
          sentiment: ins?.sentiment || 'neutral',
          productFit: ins?.productFit || 'uncertain',
          shouldReply: ins?.shouldReply ?? false,
          priority: ins?.priority || 'low',
          suggestedReply: (ins?.suggestedReply || '').replace(/\{\{CHECKOUT_LINK\}\}/g, checkoutPath),
          reason: ins?.reason || '',
          replyStatus: null as ReplyStatus | null,
        };

        if (autoReply && enriched.shouldReply) {
          enriched.replyStatus = await autoReplyToInsight(
            tenantId,
            product,
            enriched,
            comments,
            repliedMemory
          );
        }

        return enriched;
      })
    );

    const purchaseLeads = insights.filter((i) => i.intent === 'purchase').length;
    const inquiries = insights.filter((i) => i.intent === 'question').length;
    const autoReplied = insights.filter(
      (i) => i.replyStatus?.sent && !i.replyStatus?.skipped && !i.replyStatus?.error
    ).length;
    const sentiment = {
      positive: insights.filter((i) => i.sentiment === 'positive' || i.intent === 'praise').length,
      neutral: insights.filter((i) => i.sentiment === 'neutral').length,
      negative: insights.filter((i) => i.sentiment === 'negative' || i.intent === 'complaint').length,
    };

    const savedRun = await saveAnalysisRun({
      tenantId,
      productId,
      createdBy: req.user!.uid,
      summary: analysis.summary,
      purchaseLeads,
      inquiries,
      autoReplied,
      totalComments: comments.length,
      sentiment,
      productReception: analysis.productReception ?? undefined,
      allComments: comments.map((c) => ({
        commentId: c.commentId,
        author: c.author,
        text: c.text,
        platform: c.platform,
        parentCommentId: c.parentCommentId,
        isReply: c.isReply,
      })),
      insights,
    });

    res.json({
      analysis: {
        id: savedRun.id,
        analyzedAt: savedRun.analyzedAt,
        summary: analysis.summary,
        purchaseLeads,
        inquiries,
        insights,
        autoReplied,
        sentiment,
        productReception: analysis.productReception ?? undefined,
        totalComments: comments.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

productAnalysisRouter.post('/:productId/comment-action', requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const { action, commentId, postId, platform, message, customerMessage } = req.body as {
      action?: 'buy' | 'connect' | 'reply';
      commentId?: string;
      postId?: string;
      platform?: string;
      message?: string;
      customerMessage?: string;
    };

    const product = await db.get('products', req.params.productId);
    if (!product || product.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3001';

    if (action === 'buy') {
      const subtotal = (product.price as number) * 1;
      const tax = Math.round(subtotal * 0.18);
      const sessionId = `cs_${uuidv4().slice(0, 8)}`;
      const now = new Date().toISOString();
      await db.set('checkout_sessions', sessionId, {
        id: sessionId,
        tenantId: req.user!.tenantId,
        productId: product.id,
        quantity: 1,
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
        source: 'product_analysis',
      });
      const checkoutUrl = `${publicUrl}/checkout/${sessionId}`;

      const assist = await buildPurchaseAssistFlow({
        productTitle: product.title as string,
        productDescription: product.description as string,
        price: product.price as number,
        customerMessage: customerMessage || message || 'I want to buy',
        checkoutUrl,
      });

      let replyStatus: ReplyStatus | null = null;
      const replyText = assist.suggestedReply.includes('http')
        ? assist.suggestedReply
        : `${assist.suggestedReply} ${checkoutUrl}`.trim();
      if (commentId && platform) {
        replyStatus = await sendCommentOnPlatform(req.user!.tenantId, platform, commentId, replyText);
        if (replyStatus.sent) replyStatus.checkoutUrl = checkoutUrl;
        await upsertCommentReplyRecord({
          tenantId: req.user!.tenantId,
          productId: product.id as string,
          insight: {
            commentId,
            postId,
            platform,
            intent: 'purchase',
            shouldReply: true,
            priority: 'high',
            suggestedReply: replyText,
            reason: 'Manual buy action',
            text: customerMessage || message,
            replyStatus,
          },
        });
      }

      return res.json({
        success: true,
        action: 'buy',
        checkoutUrl,
        suggestedReply: assist.suggestedReply,
        dmScript: assist.dmScript,
        replyStatus,
      });
    }

    if (action === 'connect') {
      const checkoutPath = `${publicUrl}/p/${(product.slug as string) || 'product'}?id=${product.id}`;
      const assist = await buildPurchaseAssistFlow({
        productTitle: product.title as string,
        productDescription: product.description as string,
        price: product.price as number,
        customerMessage: customerMessage || message || 'Tell me more about this product',
        checkoutUrl: checkoutPath,
      });

      const replyText = message || assist.suggestedReply;
      let replyStatus: ReplyStatus | null = null;
      if (commentId && platform) {
        replyStatus = await sendCommentOnPlatform(req.user!.tenantId, platform, commentId, replyText);
        await upsertCommentReplyRecord({
          tenantId: req.user!.tenantId,
          productId: product.id as string,
          insight: {
            commentId,
            platform,
            intent: 'question',
            shouldReply: true,
            priority: 'medium',
            suggestedReply: replyText,
            reason: 'Manual connect action',
            text: customerMessage || message,
            replyStatus,
          },
        });
      }

      return res.json({
        success: true,
        action: 'connect',
        suggestedReply: assist.suggestedReply,
        dmScript: assist.dmScript,
        checkoutUrl: checkoutPath,
        replyStatus,
      });
    }

    if (action === 'reply' && commentId && platform && message) {
      const replyStatus = await sendCommentOnPlatform(req.user!.tenantId, platform, commentId, message);
      if (!replyStatus.sent) {
        return res.status(400).json({ error: { message: replyStatus.error || 'Reply failed' }, replyStatus });
      }
      await upsertCommentReplyRecord({
        tenantId: req.user!.tenantId,
        productId: product.id as string,
        insight: {
          commentId,
          platform,
          intent: 'other',
          shouldReply: true,
          priority: 'medium',
          suggestedReply: message,
          reason: 'Manual reply',
          replyStatus,
        },
      });
      return res.json({ success: true, action: 'reply', replyStatus });
    }

    return res.status(400).json({ error: { message: 'Invalid action' } });
  } catch (err) {
    next(err);
  }
});
