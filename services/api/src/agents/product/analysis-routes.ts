import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import type { AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { analyzePostComments, buildPurchaseAssistFlow } from '../../lib/gemini-social';
import {
  applyPurchaseIntentRules,
  autoReplyToInsight,
  buildRepliedMemory,
  createCheckoutSession,
  loadProductComments,
  sendCommentOnPlatform,
  shouldAutoReplyComment,
  syncProductAnalysis,
} from './analysis-automation';
import {
  computeSentimentBreakdown,
  getAnalysisHistory,
  getCommentReplyRecords,
  getLatestAnalysisRun,
  recordToInsight,
  saveAnalysisRun,
  textHasPurchaseIntent,
  toCommentSnapshot,
  upsertCommentReplyRecord,
} from './product-analysis-store';

export const productAnalysisRouter = Router({ mergeParams: true });

export type { ReplyStatus } from './product-analysis-store';
export type { ProductCommentRow } from './analysis-automation';
export { sendCommentOnPlatform } from './analysis-automation';
import type { ReplyStatus, ProductCommentReplyRecord } from './product-analysis-store';

productAnalysisRouter.get('/:productId/analysis', async (req: AuthRequest, res, next) => {
  try {
    const productId = String(req.params.productId);
    const product = await db.get('products', productId);
    if (!product || product.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    const { comments, posts, platformErrors } = await loadProductComments(req.user!.tenantId, productId);

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
    const [savedAnalysis, commentRecords, analysisHistory] = await Promise.all([
      getLatestAnalysisRun(tenantId, productId),
      getCommentReplyRecords(tenantId, productId),
      getAnalysisHistory(tenantId, productId, 20),
    ]);

    const latestRun = savedAnalysis || analysisHistory[0];

    const savedAnalysisForClient = latestRun
      ? {
          id: latestRun.id,
          analyzedAt: latestRun.analyzedAt,
          summary: latestRun.summary,
          purchaseLeads: latestRun.purchaseLeads,
          inquiries: latestRun.inquiries,
          autoReplied: latestRun.autoReplied,
          totalComments: latestRun.totalComments,
          sentiment: latestRun.sentiment,
          productReception: latestRun.productReception,
          insights:
            latestRun.insights?.length
              ? latestRun.insights
              : commentRecords.map((r) => recordToInsight(r)),
        }
      : null;

    const recordByComment = new Map(commentRecords.map((r) => [r.commentId, r]));
    const mergedComments = comments.map((c) => {
      const rec = recordByComment.get(c.commentId);
      return {
        ...c,
        savedInFirebase: Boolean(rec),
        intent: rec?.intent,
        sentiment: rec?.sentiment,
        buyIntent: rec?.buyIntent ?? rec?.intent === 'purchase',
        replyStatus: rec?.replyStatus ?? null,
        suggestedReply: rec?.suggestedReply,
        syncedAt: rec?.syncedAt,
        repliedAt: rec?.repliedAt,
      };
    });

    const storedSentiment = commentRecords.length
      ? computeSentimentBreakdown(commentRecords)
      : latestRun
        ? {
            positive: latestRun.sentiment.positive,
            neutral: latestRun.sentiment.neutral,
            negative: latestRun.sentiment.negative,
            purchase: latestRun.purchaseLeads,
            inquiry: latestRun.inquiries,
          }
        : null;

    res.json({
      product: {
        id: product.id,
        title: product.title,
        price: product.price,
        description: product.description,
        publicUrl: product.publicUrl,
        images: product.images,
        lastAnalyzedAt: product.lastAnalyzedAt,
        lastSyncedAt: product.lastSyncedAt,
      },
      stats: {
        totalPosts: posts.length,
        publishedPosts: publishedPosts.length,
        totalComments: comments.length,
        platformCounts,
        savedReplies: commentRecords.filter((r) => r.replyStatus?.sent).length,
        firebaseComments: commentRecords.length,
      },
      comments: mergedComments,
      sentiment: storedSentiment,
      savedAnalysis: savedAnalysisForClient,
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
      platformErrors,
      automation: {
        liveSyncAvailable: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Real-time sync: refresh comments, analyze new ones, auto-reply with buy link on purchase intent */
productAnalysisRouter.post(
  '/:productId/analysis/sync',
  requireRole('owner', 'admin'),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await syncProductAnalysis({
        tenantId: req.user!.tenantId,
        productId: String(req.params.productId),
        createdBy: req.user!.uid,
        autoAnalyze: req.body?.autoAnalyze !== false,
        autoReply: req.body?.autoReply !== false,
      });

      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message === 'Product not found') {
        return res.status(404).json({ error: { message: err.message } });
      }
      const msg = err instanceof Error ? err.message : 'Sync failed';
      if (/Firestore|undefined|INVALID_ARGUMENT/i.test(msg)) {
        console.error('[product-analysis/sync] Firestore write failed:', msg);
        return res.status(500).json({
          error: {
            code: 'FIRESTORE_WRITE_FAILED',
            message:
              'Could not save analysis to Firebase. Restart the API after pulling latest changes, then sync again.',
          },
        });
      }
      next(err);
    }
  }
);

productAnalysisRouter.post('/:productId/analyze', requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const autoReply = req.body?.autoReply !== false;

    const productId = String(req.params.productId);
    const product = await db.get('products', productId);
    if (!product || product.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    const tenantId = req.user!.tenantId;
    const { comments } = await loadProductComments(tenantId, productId);

    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
    const checkoutPath = `${publicUrl}/p/${(product.slug as string) || 'product'}?id=${product.id}`;

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

    for (const c of comments) {
      const text = c.text || '';
      const wantsPayment = textHasPurchaseIntent(text);
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
      if (ins) applyPurchaseIntentRules(ins);
    }

    const newIdsAnalyze = new Set(
      comments.filter((c) => {
        const rec = existingRecords.find((r) => r.commentId === c.commentId);
        return !rec || (rec.commentText || '').trim() !== (c.text || '').trim();
      }).map((c) => c.commentId)
    );

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

        applyPurchaseIntentRules(enriched);
        const isNew = newIdsAnalyze.has(row.commentId);
        if (autoReply && shouldAutoReplyComment(enriched, isNew, repliedMemory)) {
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
      allComments: comments.map((c) => toCommentSnapshot(c)),
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
    const { action, commentId, postId, platform, message, customerMessage, customerName } = req.body as {
      action?: 'buy' | 'connect' | 'reply';
      commentId?: string;
      postId?: string;
      platform?: string;
      message?: string;
      customerMessage?: string;
      customerName?: string;
    };

    const productId = String(req.params.productId);
    const product = await db.get('products', productId);
    if (!product || product.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3001';

    if (action === 'buy') {
      const checkoutUrl = await createCheckoutSession(req.user!.tenantId, product, 'product_analysis', {
        commentId,
        platform,
        postId,
        customerName,
      });

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
            sentiment: 'positive',
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
