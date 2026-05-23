import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { analyzePostComments, buildPurchaseAssistFlow } from '../../lib/gemini-social';
import {
  computeSentimentBreakdown,
  findCommentsNeedingAnalysis,
  getCommentReplyRecords,
  getLatestAnalysisRun,
  inferIntentAndSentiment,
  persistSyncedComments,
  recordToInsight,
  saveAnalysisRun,
  textHasPurchaseIntent,
  toCommentSnapshot,
  type SentimentBreakdown,
} from './product-analysis-store';
import type {
  ReplyStatus,
  ProductCommentReplyRecord,
  StoredCommentInsight,
} from './product-analysis-store';
import {
  replyToFacebookComment,
  replyToInstagramComment,
} from '../publish/platforms/meta-engagement';
import { replyToYouTubeComment } from '../publish/platforms/youtube-engagement';
import { getSocialCredentials } from '../social-connect/token-store';
import type { SocialPlatform } from '../social-connect/config';
import { loadPostEngagement } from '../publish/post-engagement';

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

export async function loadProductComments(
  tenantId: string,
  productId: string
): Promise<{
  comments: ProductCommentRow[];
  posts: Record<string, unknown>[];
  platformErrors: Array<{ platform: string; postId?: string; error: string }>;
}> {
  const posts = await db.query('scheduled_posts', {
    filters: [
      { field: 'tenantId', op: '==', value: tenantId },
      { field: 'productId', op: '==', value: productId },
    ],
    orderBy: { field: 'scheduledAt', direction: 'desc' },
    limit: 100,
  });

  const comments: ProductCommentRow[] = [];
  const platformErrors: Array<{ platform: string; postId?: string; error: string }> = [];

  for (const post of posts) {
    const results = post.publishResults as Record<string, { ok?: boolean }> | undefined;
    const isPublished =
      post.status === 'published' || Boolean(results && Object.values(results).some((r) => r.ok));
    if (!isPublished) continue;

    try {
      const eng = await loadPostEngagement(tenantId, post);
      for (const p of eng.platforms) {
        if (p.error) {
          platformErrors.push({
            platform: p.platform,
            postId: post.id as string,
            error: p.error,
          });
        }
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
    } catch (err) {
      platformErrors.push({
        platform: 'unknown',
        postId: post.id as string,
        error: err instanceof Error ? err.message : 'Failed to load post engagement',
      });
    }
  }

  const byId = new Map(comments.map((c) => [c.commentId, c]));
  const stored = await getCommentReplyRecords(tenantId, productId);
  for (const rec of stored) {
    if (byId.has(rec.commentId)) continue;
    byId.set(rec.commentId, {
      commentId: rec.commentId,
      postId: (rec.postId as string) || '',
      author: rec.author || 'User',
      text: rec.commentText || '',
      platform: rec.platform || 'unknown',
      parentCommentId: rec.parentCommentId,
      parentAuthor: rec.parentAuthor,
      isReply: rec.isReply,
    });
  }

  return { comments: Array.from(byId.values()), posts, platformErrors };
}

export function buildRepliedMemory(records: ProductCommentReplyRecord[]) {
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

export function findNewOrChangedComments(
  comments: ProductCommentRow[],
  records: ProductCommentReplyRecord[]
): ProductCommentRow[] {
  const byId = new Map(records.map((r) => [r.commentId, r]));
  return comments.filter((c) => {
    const rec = byId.get(c.commentId);
    if (!rec) return true;
    const prev = (rec.commentText || '').trim();
    const curr = (c.text || '').trim();
    return prev !== curr;
  });
}

export async function createCheckoutSession(
  tenantId: string,
  product: Record<string, unknown>,
  source: string,
  extra?: Record<string, unknown>
): Promise<string> {
  const { createPendingOrderFromCheckout } = await import('../order/routes');
  const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
  const subtotal = (product.price as number) * 1;
  const tax = Math.round(subtotal * 0.18);
  const sessionId = `cs_${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  const customerName = ((extra?.customerName || extra?.author) as string | undefined)?.trim();
  const customer = customerName
    ? {
        name: customerName.replace(/^@/, ''),
        email: '',
        phone: '',
        platform: extra?.platform as string | undefined,
        commentId: extra?.commentId as string | undefined,
      }
    : undefined;

  const session = {
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
    source,
    customer,
    ...extra,
  };
  await db.set('checkout_sessions', sessionId, session);
  await createPendingOrderFromCheckout(session);
  return `${publicUrl}/checkout/${sessionId}`;
}

export async function sendCommentOnPlatform(
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

/** Purchase intent always gets auto-reply with checkout link if not already sent (including thread replies). */
export function shouldAutoReplyComment(
  insight: { commentId: string; intent: string; shouldReply: boolean; text?: string },
  isNew: boolean,
  repliedMemory: Map<string, { commentText: string; replyText: string; platform: string }>
): boolean {
  const currentText = (insight.text || '').trim();
  const wantsPurchase =
    insight.intent === 'purchase' || textHasPurchaseIntent(currentText);

  if (wantsPurchase) {
    const prior = repliedMemory.get(insight.commentId);
    if (prior && prior.commentText === currentText && prior.replyText) {
      const sentBuyLink = /checkout|https?:\/\//i.test(prior.replyText);
      if (sentBuyLink) return false;
    }
    return true;
  }
  return insight.shouldReply && isNew;
}

export function applyPurchaseIntentRules<T extends {
  intent: string;
  shouldReply: boolean;
  priority: string;
  suggestedReply: string;
}>(ins: T): T {
  if (ins.intent !== 'purchase') return ins;
  ins.shouldReply = true;
  ins.priority = 'high';
  if (!ins.suggestedReply?.trim()) {
    ins.suggestedReply = 'Thanks for your interest! Order here: {{CHECKOUT_LINK}}';
  }
  return ins;
}

export async function autoReplyToInsight(
  tenantId: string,
  product: Record<string, unknown>,
  insight: {
    commentId: string;
    postId?: string;
    author?: string;
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
  if (insight.intent === 'purchase') {
    insight.shouldReply = true;
  } else if (!insight.shouldReply) {
    return null;
  }

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
      checkoutUrl = await createCheckoutSession(tenantId, product, 'product_analysis_auto', {
        commentId,
        platform,
        postId: insight.postId || row?.postId,
        customerName: insight.author || row?.author,
      });

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

export interface ProductAnalysisSyncResult {
  syncedAt: string;
  totalComments: number;
  newComments: number;
  savedToFirebase: number;
  analyzed: boolean;
  autoReplied: number;
  purchaseLeads: number;
  comments: ProductCommentRow[];
  insights: StoredCommentInsight[];
  sentiment: SentimentBreakdown;
  analysis?: {
    id: string;
    analyzedAt: string;
    summary: string;
    purchaseLeads: number;
    inquiries: number;
    autoReplied: number;
    totalComments: number;
    sentiment: { positive: number; neutral: number; negative: number };
    productReception?: unknown;
  };
  platformErrors?: Array<{ platform: string; postId?: string; error: string }>;
}

export async function syncProductAnalysis(input: {
  tenantId: string;
  productId: string;
  createdBy?: string;
  autoAnalyze?: boolean;
  autoReply?: boolean;
}): Promise<ProductAnalysisSyncResult> {
  const autoAnalyze = input.autoAnalyze !== false;
  const autoReply = input.autoReply !== false;
  const syncedAt = new Date().toISOString();

  const product = await db.get('products', input.productId);
  if (!product || product.tenantId !== input.tenantId) {
    throw new Error('Product not found');
  }

  const { comments, platformErrors: fetchPlatformErrors } = await loadProductComments(
    input.tenantId,
    input.productId
  );

  if (comments.length === 0) {
    const syncedAtOnly = syncedAt;
    await db.update('products', input.productId, { lastSyncedAt: syncedAtOnly, updatedAt: syncedAtOnly });
    return {
      syncedAt: syncedAtOnly,
      totalComments: 0,
      newComments: 0,
      savedToFirebase: 0,
      analyzed: false,
      autoReplied: 0,
      purchaseLeads: 0,
      comments: [],
      insights: [],
      sentiment: { positive: 0, neutral: 0, negative: 0, purchase: 0, inquiry: 0 },
      platformErrors: [],
    };
  }

  const existingRecords = await getCommentReplyRecords(input.tenantId, input.productId);
  const newRows = findNewOrChangedComments(comments, existingRecords);
  const needingAnalysis = findCommentsNeedingAnalysis(comments, existingRecords);
  const repliedMemory = buildRepliedMemory(existingRecords);

  const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
  const checkoutPath = `${publicUrl}/p/${(product.slug as string) || 'product'}?id=${product.id}`;

  let insights: StoredCommentInsight[] = [];
  let autoReplied = 0;
  let purchaseLeads = 0;
  let analyzed = false;
  let savedAnalysis: ProductAnalysisSyncResult['analysis'];
  const insightMap = new Map<string, StoredCommentInsight>();

  const isFirstSync = comments.length > 0 && existingRecords.length === 0;
  const newPurchaseComments = newRows.filter((c) => textHasPurchaseIntent(c.text));
  const shouldRunAi =
    autoAnalyze &&
    comments.length > 0 &&
    (needingAnalysis.length > 0 || isFirstSync || newPurchaseComments.length > 0);

  if (shouldRunAi) {
    analyzed = true;
    let analysis: Awaited<ReturnType<typeof analyzePostComments>>;
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
    } catch {
      const fallbackInsights = comments.map((c) => {
        const inferred = inferIntentAndSentiment(c.text);
        return {
          commentId: c.commentId,
          intent: inferred.intent,
          sentiment: inferred.sentiment,
          productFit: inferred.productFit,
          shouldReply: inferred.shouldReply,
          priority: inferred.priority,
          suggestedReply: inferred.suggestedReply,
          reason: inferred.reason,
        };
      });
      analysis = {
        summary: `Synced ${comments.length} comment(s) with rule-based sentiment`,
        purchaseLeads: fallbackInsights.filter((i) => i.intent === 'purchase').length,
        insights: fallbackInsights,
      } as Awaited<ReturnType<typeof analyzePostComments>>;
    }

    const insightByCommentId = new Map(analysis.insights.map((i) => [i.commentId, i]));
    const newIds = new Set(newRows.map((c) => c.commentId));

    for (const c of comments) {
      const text = c.text || '';
      const wantsPayment = textHasPurchaseIntent(text);
      let ins = insightByCommentId.get(c.commentId);

      if (!ins) {
        ins = {
          commentId: c.commentId,
          intent: wantsPayment ? 'purchase' : 'other',
          sentiment: wantsPayment ? 'positive' : 'neutral',
          productFit: wantsPayment ? 'good_fit' : 'uncertain',
          shouldReply: wantsPayment,
          priority: wantsPayment ? 'high' : 'low',
          suggestedReply: wantsPayment ? 'Thanks for asking! You can order here: {{CHECKOUT_LINK}}' : '',
          reason: 'Detected from comment text',
        };
        insightByCommentId.set(c.commentId, ins);
        analysis.insights.push(ins);
        continue;
      }

      if (
        wantsPayment &&
        (c.isReply || ins.intent === 'question' || ins.intent === 'other' || ins.intent === 'purchase')
      ) {
        ins.shouldReply = true;
        ins.priority = 'high';
        ins.sentiment = ins.sentiment === 'negative' ? ins.sentiment : 'positive';
        if (ins.intent === 'other' || ins.intent === 'question') ins.intent = 'purchase';
        if (!ins.suggestedReply?.trim()) {
          ins.suggestedReply = 'Thanks for asking! You can order here: {{CHECKOUT_LINK}}';
        }
      }
      if (ins) applyPurchaseIntentRules(ins);
    }

    for (const row of comments) {
      const ins = insightByCommentId.get(row.commentId);
      const enriched: StoredCommentInsight = {
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
        replyStatus: null,
      };

      applyPurchaseIntentRules(enriched);
      const isNew = newIds.has(row.commentId);
      if (autoReply && shouldAutoReplyComment(enriched, isNew, repliedMemory)) {
        enriched.replyStatus = await autoReplyToInsight(
          input.tenantId,
          product,
          enriched,
          comments,
          repliedMemory
        );
      }

      insightMap.set(row.commentId, enriched);
    }

    insights = Array.from(insightMap.values());
    purchaseLeads = insights.filter((i) => i.intent === 'purchase').length;
    const inquiries = insights.filter((i) => i.intent === 'question').length;
    autoReplied = insights.filter(
      (i) => i.replyStatus?.sent && !i.replyStatus?.skipped && !i.replyStatus?.error
    ).length;
    const sentimentCounts = computeSentimentBreakdown(insights);

    const savedRun = await saveAnalysisRun({
      tenantId: input.tenantId,
      productId: input.productId,
      createdBy: input.createdBy,
      summary: analysis.summary,
      purchaseLeads,
      inquiries,
      autoReplied,
      totalComments: comments.length,
      sentiment: {
        positive: sentimentCounts.positive,
        neutral: sentimentCounts.neutral,
        negative: sentimentCounts.negative,
      },
      productReception: analysis.productReception ?? undefined,
      allComments: comments.map((c) => toCommentSnapshot(c)),
      insights,
    });

    savedAnalysis = {
      id: savedRun.id,
      analyzedAt: savedRun.analyzedAt,
      summary: analysis.summary,
      purchaseLeads,
      inquiries,
      autoReplied,
      totalComments: comments.length,
      sentiment: savedRun.sentiment,
      productReception: analysis.productReception,
    };
  } else {
    const newIds = new Set(newRows.map((c) => c.commentId));
    for (const row of comments) {
      const existing = existingRecords.find((r) => r.commentId === row.commentId);
      const fallback = inferIntentAndSentiment(row.text);
      const enriched: StoredCommentInsight = existing
        ? recordToInsight(existing)
        : {
            commentId: row.commentId,
            postId: row.postId,
            author: row.author,
            text: row.text,
            platform: row.platform,
            parentCommentId: row.parentCommentId,
            parentAuthor: row.parentAuthor,
            isReply: row.isReply,
            intent: fallback.intent,
            sentiment: fallback.sentiment,
            productFit: fallback.productFit,
            shouldReply: fallback.shouldReply,
            priority: fallback.priority,
            suggestedReply: fallback.suggestedReply.replace(/\{\{CHECKOUT_LINK\}\}/g, checkoutPath),
            reason: fallback.reason,
            replyStatus: null,
          };

      if (textHasPurchaseIntent(row.text)) {
        enriched.intent = 'purchase';
        enriched.shouldReply = true;
        enriched.priority = 'high';
        if (!enriched.suggestedReply?.trim()) {
          enriched.suggestedReply = `Thanks for asking! You can order here: ${checkoutPath}`;
        }
      }
      applyPurchaseIntentRules(enriched);

      if (autoReply && shouldAutoReplyComment(enriched, newIds.has(row.commentId), repliedMemory)) {
        enriched.replyStatus = await autoReplyToInsight(
          input.tenantId,
          product,
          enriched,
          comments,
          repliedMemory
        );
        if (enriched.replyStatus?.sent && !enriched.replyStatus?.skipped) {
          autoReplied += 1;
        }
      }

      insightMap.set(row.commentId, enriched);
    }
    insights = Array.from(insightMap.values());
    purchaseLeads = insights.filter((i) => i.intent === 'purchase').length;
  }

  await persistSyncedComments({
    tenantId: input.tenantId,
    productId: input.productId,
    comments,
    insightByCommentId: insightMap,
    syncedAt,
    analysisRunId: savedAnalysis?.id,
    analyzedAt: savedAnalysis?.analyzedAt,
  });

  await db.update('products', input.productId, {
    lastSyncedAt: syncedAt,
    updatedAt: syncedAt,
  });

  const refreshedRecords = await getCommentReplyRecords(input.tenantId, input.productId);
  insights = refreshedRecords.map((r) => recordToInsight(r));
  const sentiment = computeSentimentBreakdown(insights);
  purchaseLeads = sentiment.purchase;

  if (!savedAnalysis) {
    const latest = await getLatestAnalysisRun(input.tenantId, input.productId);
    if (latest) {
      savedAnalysis = {
        id: latest.id,
        analyzedAt: latest.analyzedAt,
        summary: latest.summary,
        purchaseLeads: latest.purchaseLeads,
        inquiries: latest.inquiries,
        autoReplied: latest.autoReplied,
        totalComments: latest.totalComments,
        sentiment: latest.sentiment,
        productReception: latest.productReception,
      };
    }
  }

  return {
    syncedAt,
    totalComments: comments.length,
    newComments: newRows.length,
    savedToFirebase: comments.length,
    analyzed,
    autoReplied,
    purchaseLeads,
    comments,
    insights,
    sentiment,
    analysis: savedAnalysis,
    platformErrors: fetchPlatformErrors,
  };
}
