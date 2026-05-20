import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';

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
  intent?: string;
  shouldReply?: boolean;
  priority?: string;
  suggestedReply?: string;
  reason?: string;
  replyStatus?: ReplyStatus | null;
  analysisRunId?: string;
  analyzedAt?: string;
  repliedAt?: string;
  updatedAt: string;
}

function replyRecordId(tenantId: string, productId: string, commentId: string): string {
  return `pcr_${tenantId.slice(0, 6)}_${productId}_${commentId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
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

  // Filter out undefined values before saving to Firestore
  const cleanRun = Object.fromEntries(
    Object.entries(run).filter(([, value]) => value !== undefined)
  ) as ProductAnalysisRun;

  await db.set('product_analysis_runs', id, cleanRun);

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

  // Filter out undefined values before saving to Firestore
  const cleanRecord = Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  ) as ProductCommentReplyRecord;

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
