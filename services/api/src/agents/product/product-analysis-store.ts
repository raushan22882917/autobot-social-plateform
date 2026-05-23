import { v4 as uuidv4 } from 'uuid';
import { db, stripUndefinedDeep } from '../../lib/db';

export interface ReplyStatus {
  sent: boolean;
  platform: string;
  replyText?: string;
  checkoutUrl?: string;
  error?: string;
  /** True when we skipped sending because this comment was already answered */
  skipped?: boolean;
}

export interface StoredCommentInsight {
  commentId: string;
  postId?: string;
  author?: string;
  text?: string;
  platform?: string;
  parentCommentId?: string;
  parentAuthor?: string;
  isReply?: boolean;
  intent: string;
  sentiment?: string;
  productFit?: string;
  shouldReply: boolean;
  priority: string;
  suggestedReply: string;
  reason: string;
  replyStatus?: ReplyStatus | null;
}

export interface ProductReceptionReport {
  score: number;
  verdict: 'good' | 'mixed' | 'needs_attention';
  summary: string;
  strengths: string[];
  concerns: string[];
}

export interface ProductAnalysisRun {
  id: string;
  tenantId: string;
  productId: string;
  summary: string;
  purchaseLeads: number;
  inquiries: number;
  autoReplied: number;
  totalComments: number;
  sentiment: { positive: number; neutral: number; negative: number };
  productReception?: ProductReceptionReport;
  insights: StoredCommentInsight[];
  /** Snapshot of all comments analyzed in this run */
  allComments?: Array<{
    commentId: string;
    author: string;
    text: string;
    platform: string;
    parentCommentId?: string;
    isReply?: boolean;
  }>;
  analyzedAt: string;
  createdBy?: string;
}

export interface ProductCommentReplyRecord {
  id: string;
  tenantId: string;
  productId: string;
  commentId: string;
  postId?: string;
  author?: string;
  commentText?: string;
  platform: string;
  parentCommentId?: string;
  parentAuthor?: string;
  isReply?: boolean;
  timestamp?: string;
  likeCount?: number;
  intent?: string;
  sentiment?: string;
  productFit?: string;
  buyIntent?: boolean;
  shouldReply?: boolean;
  priority?: string;
  suggestedReply?: string;
  reason?: string;
  replyStatus?: ReplyStatus | null;
  analysisRunId?: string;
  analyzedAt?: string;
  repliedAt?: string;
  syncedAt?: string;
  updatedAt: string;
}

export interface ProductCommentSnapshot {
  commentId: string;
  postId: string;
  author: string;
  text: string;
  platform: string;
  parentCommentId?: string;
  parentAuthor?: string;
  isReply?: boolean;
  timestamp?: string;
  likeCount?: number;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
  purchase: number;
  inquiry: number;
}

function replyRecordId(tenantId: string, productId: string, commentId: string): string {
  return `pcr_${tenantId.slice(0, 6)}_${productId}_${commentId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

type CommentSnapshot = NonNullable<ProductAnalysisRun['allComments']>[number];

/** Remove optional fields so Firestore never receives `undefined` (including nested replyStatus). */
export function sanitizeStoredInsight(ins: StoredCommentInsight): StoredCommentInsight {
  return stripUndefinedDeep(ins) as StoredCommentInsight;
}

export function toCommentSnapshot(c: {
  commentId: string;
  author: string;
  text: string;
  platform: string;
  parentCommentId?: string;
  isReply?: boolean;
}): CommentSnapshot {
  const row: CommentSnapshot = {
    commentId: c.commentId,
    author: c.author,
    text: c.text,
    platform: c.platform,
  };
  if (c.parentCommentId) row.parentCommentId = c.parentCommentId;
  if (c.isReply === true) row.isReply = true;
  return row;
}

/** Shared buy/payment intent detection (top-level + thread replies) */
export const PAYMENT_ASK_PATTERN =
  /payment|pay\s*link|checkout|buy\s*link|purchase\s*link|send\s*link|how\s*(?:do\s*i|can\s*i|to)\s*buy|how\s*i\s*can\s*buy|want\s*to\s*buy|cost|price|order|\bbuy\b|purchase/i;

export function textHasPurchaseIntent(text: string): boolean {
  return PAYMENT_ASK_PATTERN.test((text || '').trim());
}

export function computeSentimentBreakdown(
  insights: Array<{ sentiment?: string; intent?: string }>
): SentimentBreakdown {
  return {
    positive: insights.filter((i) => i.sentiment === 'positive' || i.intent === 'praise').length,
    neutral: insights.filter((i) => i.sentiment === 'neutral' || i.intent === 'question').length,
    negative: insights.filter((i) => i.sentiment === 'negative' || i.intent === 'complaint').length,
    purchase: insights.filter((i) => i.intent === 'purchase').length,
    inquiry: insights.filter((i) => i.intent === 'question' || i.intent === 'inquiry').length,
  };
}

/** Quick intent + sentiment when Gemini is not run (still saved to Firebase) */
export function inferIntentAndSentiment(text: string): Pick<
  StoredCommentInsight,
  'intent' | 'sentiment' | 'productFit' | 'shouldReply' | 'priority' | 'suggestedReply' | 'reason'
> {
  const t = (text || '').trim();
  const wantsPayment = textHasPurchaseIntent(t);
  const negative = /\b(bad|worst|refund|scam|fake|poor|disappointed|never|hate|broken|defect)\b/i.test(t);
  const positive = /\b(love|great|awesome|amazing|perfect|nice|beautiful|excellent|want|interested)\b/i.test(t);
  const question = /\?|how|what|when|where|which|available|size|color/i.test(t);

  if (wantsPayment) {
    return {
      intent: 'purchase',
      sentiment: 'positive',
      productFit: 'good_fit',
      shouldReply: true,
      priority: 'high',
      suggestedReply: 'Thanks for asking! You can order here: {{CHECKOUT_LINK}}',
      reason: 'Buy / payment intent detected',
    };
  }
  if (negative) {
    return {
      intent: 'complaint',
      sentiment: 'negative',
      productFit: 'poor_fit',
      shouldReply: true,
      priority: 'high',
      suggestedReply: '',
      reason: 'Negative feedback detected',
    };
  }
  if (question) {
    return {
      intent: 'question',
      sentiment: 'neutral',
      productFit: 'uncertain',
      shouldReply: true,
      priority: 'medium',
      suggestedReply: '',
      reason: 'Product question detected',
    };
  }
  if (positive) {
    return {
      intent: 'praise',
      sentiment: 'positive',
      productFit: 'good_fit',
      shouldReply: false,
      priority: 'low',
      suggestedReply: 'Thank you so much! 🙏',
      reason: 'Positive engagement',
    };
  }
  return {
    intent: 'other',
    sentiment: 'neutral',
    productFit: 'uncertain',
    shouldReply: false,
    priority: 'low',
    suggestedReply: '',
    reason: 'Synced from social platform',
  };
}

export function findCommentsNeedingAnalysis(
  comments: ProductCommentSnapshot[],
  records: ProductCommentReplyRecord[]
): ProductCommentSnapshot[] {
  const byId = new Map(records.map((r) => [r.commentId, r]));
  return comments.filter((c) => {
    const rec = byId.get(c.commentId);
    if (!rec) return true;
    const prev = (rec.commentText || '').trim();
    const curr = (c.text || '').trim();
    if (prev !== curr) return true;
    if (!rec.sentiment || !rec.intent) return true;
    return false;
  });
}

export function recordToInsight(rec: ProductCommentReplyRecord): StoredCommentInsight {
  return {
    commentId: rec.commentId,
    postId: rec.postId,
    author: rec.author,
    text: rec.commentText,
    platform: rec.platform,
    parentCommentId: rec.parentCommentId,
    parentAuthor: rec.parentAuthor,
    isReply: rec.isReply,
    intent: rec.intent || 'other',
    sentiment: rec.sentiment || 'neutral',
    productFit: rec.productFit || 'uncertain',
    shouldReply: rec.shouldReply ?? false,
    priority: rec.priority || 'low',
    suggestedReply: rec.suggestedReply || '',
    reason: rec.reason || '',
    replyStatus: rec.replyStatus ?? null,
  };
}

/** Persist every synced comment + insight to Firebase (product_comment_replies) */
export async function persistSyncedComments(input: {
  tenantId: string;
  productId: string;
  comments: ProductCommentSnapshot[];
  insightByCommentId?: Map<string, StoredCommentInsight>;
  syncedAt: string;
  analysisRunId?: string;
  analyzedAt?: string;
}): Promise<ProductCommentReplyRecord[]> {
  const results: ProductCommentReplyRecord[] = [];
  for (const row of input.comments) {
    const ai = input.insightByCommentId?.get(row.commentId);
    const fallback = inferIntentAndSentiment(row.text);
    const record = await upsertCommentReplyRecord({
      tenantId: input.tenantId,
      productId: input.productId,
      analysisRunId: input.analysisRunId,
      analyzedAt: input.analyzedAt,
      insight: {
        commentId: row.commentId,
        postId: row.postId,
        author: row.author,
        text: row.text,
        platform: row.platform,
        parentCommentId: row.parentCommentId,
        parentAuthor: row.parentAuthor,
        isReply: row.isReply,
        intent: ai?.intent ?? fallback.intent,
        sentiment: ai?.sentiment ?? fallback.sentiment,
        productFit: ai?.productFit ?? fallback.productFit,
        shouldReply: ai?.shouldReply ?? fallback.shouldReply,
        priority: ai?.priority ?? fallback.priority,
        suggestedReply: ai?.suggestedReply ?? fallback.suggestedReply,
        reason: ai?.reason ?? fallback.reason,
        replyStatus: ai?.replyStatus ?? null,
      },
    });
    const withMeta: ProductCommentReplyRecord = {
      ...record,
      timestamp: row.timestamp ?? record.timestamp,
      likeCount: row.likeCount ?? record.likeCount,
      buyIntent: (ai?.intent ?? fallback.intent) === 'purchase',
      syncedAt: input.syncedAt,
    };
    const clean = stripUndefinedDeep(withMeta) as ProductCommentReplyRecord;
    await db.set('product_comment_replies', record.id, clean);
    results.push(clean);
  }
  return results;
}

export async function saveAnalysisRun(input: {
  tenantId: string;
  productId: string;
  createdBy?: string;
  summary: string;
  purchaseLeads: number;
  inquiries: number;
  autoReplied: number;
  totalComments: number;
  sentiment: ProductAnalysisRun['sentiment'];
  insights: StoredCommentInsight[];
  productReception?: ProductReceptionReport;
  allComments?: ProductAnalysisRun['allComments'];
}): Promise<ProductAnalysisRun> {
  const id = `par_${uuidv4().slice(0, 10)}`;
  const analyzedAt = new Date().toISOString();
  const run: ProductAnalysisRun = {
    id,
    tenantId: input.tenantId,
    productId: input.productId,
    summary: input.summary,
    purchaseLeads: input.purchaseLeads,
    inquiries: input.inquiries,
    autoReplied: input.autoReplied,
    totalComments: input.totalComments,
    sentiment: input.sentiment,
    productReception: input.productReception,
    allComments: input.allComments,
    insights: input.insights,
    analyzedAt,
    createdBy: input.createdBy,
  };

  const cleanRun = stripUndefinedDeep({
    ...run,
    allComments: input.allComments?.map((c) => toCommentSnapshot(c)),
    insights: input.insights.map((ins) => sanitizeStoredInsight(ins)),
    ...(input.productReception ? { productReception: input.productReception } : {}),
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
  }) as ProductAnalysisRun;

  await db.set('product_analysis_runs', id, cleanRun as Record<string, unknown>);

  await db.update('products', input.productId, {
    lastAnalysisRunId: id,
    lastAnalyzedAt: analyzedAt,
    updatedAt: analyzedAt,
  });

  for (const ins of input.insights) {
    await upsertCommentReplyRecord({
      tenantId: input.tenantId,
      productId: input.productId,
      analysisRunId: id,
      analyzedAt,
      insight: ins,
    });
  }

  return run;
}

export async function upsertCommentReplyRecord(input: {
  tenantId: string;
  productId: string;
  analysisRunId?: string;
  analyzedAt?: string;
  insight: StoredCommentInsight;
}): Promise<ProductCommentReplyRecord> {
  const { insight } = input;
  const now = new Date().toISOString();
  const id = replyRecordId(input.tenantId, input.productId, insight.commentId);
  const existing = await db.get('product_comment_replies', id);

  const record: ProductCommentReplyRecord = {
    id,
    tenantId: input.tenantId,
    productId: input.productId,
    commentId: insight.commentId,
    postId: insight.postId ?? (existing?.postId as string | undefined),
    author: insight.author ?? (existing?.author as string | undefined),
    commentText: insight.text ?? (existing?.commentText as string | undefined),
    platform: (insight.platform || existing?.platform || 'unknown') as string,
    parentCommentId: insight.parentCommentId ?? (existing?.parentCommentId as string | undefined),
    parentAuthor: insight.parentAuthor ?? (existing?.parentAuthor as string | undefined),
    isReply: insight.isReply ?? (existing?.isReply as boolean | undefined),
    buyIntent: (insight.intent ?? (existing?.intent as string | undefined)) === 'purchase',
    sentiment: insight.sentiment ?? (existing?.sentiment as string | undefined),
    productFit: insight.productFit ?? (existing?.productFit as string | undefined),
    intent: insight.intent ?? (existing?.intent as string | undefined),
    shouldReply: insight.shouldReply ?? (existing?.shouldReply as boolean | undefined),
    priority: insight.priority ?? (existing?.priority as string | undefined),
    suggestedReply: insight.suggestedReply ?? (existing?.suggestedReply as string | undefined),
    reason: insight.reason ?? (existing?.reason as string | undefined),
    replyStatus: insight.replyStatus ?? (existing?.replyStatus as ReplyStatus | null | undefined) ?? null,
    analysisRunId: input.analysisRunId ?? (existing?.analysisRunId as string | undefined),
    analyzedAt: input.analyzedAt ?? (existing?.analyzedAt as string | undefined),
    repliedAt: insight.replyStatus?.sent ? now : (existing?.repliedAt as string | undefined),
    updatedAt: now,
  };

  const cleanRecord = stripUndefinedDeep(record) as ProductCommentReplyRecord;

  await db.set('product_comment_replies', id, cleanRecord);
  return record;
}

export async function getLatestAnalysisRun(
  tenantId: string,
  productId: string
): Promise<ProductAnalysisRun | null> {
  const product = await db.get('products', productId);
  if (product?.lastAnalysisRunId && product.tenantId === tenantId) {
    const run = await db.get('product_analysis_runs', product.lastAnalysisRunId as string);
    if (run && run.tenantId === tenantId && run.productId === productId) {
      return run as ProductAnalysisRun;
    }
  }

  const runs = await db.query('product_analysis_runs', {
    filters: [
      { field: 'tenantId', op: '==', value: tenantId },
      { field: 'productId', op: '==', value: productId },
    ],
    orderBy: { field: 'analyzedAt', direction: 'desc' },
    limit: 1,
  });

  return (runs[0] as ProductAnalysisRun) || null;
}

export async function getCommentReplyRecords(
  tenantId: string,
  productId: string
): Promise<ProductCommentReplyRecord[]> {
  const records = await db.query('product_comment_replies', {
    filters: [
      { field: 'tenantId', op: '==', value: tenantId },
      { field: 'productId', op: '==', value: productId },
    ],
    orderBy: { field: 'updatedAt', direction: 'desc' },
    limit: 500,
  });
  return records as ProductCommentReplyRecord[];
}

export async function getAnalysisHistory(
  tenantId: string,
  productId: string,
  limit = 20
): Promise<ProductAnalysisRun[]> {
  const runs = await db.query('product_analysis_runs', {
    filters: [
      { field: 'tenantId', op: '==', value: tenantId },
      { field: 'productId', op: '==', value: productId },
    ],
    orderBy: { field: 'analyzedAt', direction: 'desc' },
    limit,
  });
  return runs as ProductAnalysisRun[];
}
