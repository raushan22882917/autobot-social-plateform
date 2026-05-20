'use client';

;

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Heart,
  Smile,
  Bot,
  GitBranch,
  AtSign,
  Share2,
  Film,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { CommentThreadModal } from '@/components/product-analysis/comment-thread-modal';
import styles from './product-analysis.module.css';
import { useAuth } from '@/hooks/use-auth';
import {
  apiClient,
  Product,
  ProductCommentRecord,
  ProductReceptionReport,
  ProductSavedAnalysis,
} from '@/lib/api';

type Intent = 'purchase' | 'inquiry' | 'feedback' | 'complaint' | 'other' | 'question' | 'praise';

interface RawComment {
  commentId: string;
  postId: string;
  author: string;
  text: string;
  platform: string;
  parentCommentId?: string;
  parentAuthor?: string;
  isReply?: boolean;
}

interface ReplyStatus {
  sent: boolean;
  platform: string;
  replyText?: string;
  checkoutUrl?: string;
  error?: string;
  skipped?: boolean;
}

interface CommentInsight {
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
  repliedAt?: string;
  saved?: boolean;
}

interface AnalysisState {
  id?: string;
  analyzedAt?: string;
  summary: string;
  purchaseLeads: number;
  inquiries: number;
  autoReplied: number;
  totalComments: number;
  sentiment: { positive: number; neutral: number; negative: number };
  productReception?: ProductReceptionReport;
  insights: CommentInsight[];
}

type CommentSort = 'impactful' | 'recent' | 'negative';

const PLATFORM_STYLES: Record<string, { label: string; className: string; accent: string; icon: 'instagram' | 'youtube' | 'facebook' | 'tiktok' | 'generic' }> = {
  instagram: {
    label: 'Instagram',
    className: 'text-[#4cd7f6]',
    accent: 'text-[#4cd7f6]',
    icon: 'instagram',
  },
  facebook: {
    label: 'Facebook',
    className: 'text-[#d0bcff]',
    accent: 'text-[#d0bcff]',
    icon: 'facebook',
  },
  youtube: {
    label: 'YouTube',
    className: 'text-[#d0bcff]',
    accent: 'text-[#d0bcff]',
    icon: 'youtube',
  },
  tiktok: {
    label: 'TikTok',
    className: 'text-[#4cd7f6]',
    accent: 'text-[#4cd7f6]',
    icon: 'tiktok',
  },
};

function platformIcon(icon: string) {
  if (icon === 'instagram') return <AtSign className="h-3.5 w-3.5" />;
  if (icon === 'tiktok') return <Film className="h-3.5 w-3.5" />;
  return <Share2 className="h-3.5 w-3.5" />;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

function primaryPlatform(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  if (!entries.length) return 'instagram';
  return entries.sort((a, b) => b[1] - a[1])[0][0].toLowerCase();
}

function sortByMode(comments: Array<RawComment & Partial<CommentInsight>>, mode: CommentSort) {
  const tops = comments.filter((c) => !c.isReply);
  const sorted = [...tops];
  if (mode === 'negative') {
    sorted.sort((a, b) => {
      if (a.sentiment === 'negative' && b.sentiment !== 'negative') return -1;
      if (b.sentiment === 'negative' && a.sentiment !== 'negative') return 1;
      return 0;
    });
  } else if (mode === 'impactful') {
    const rank = { high: 0, medium: 1, low: 2 };
    sorted.sort((a, b) => (rank[a.priority as keyof typeof rank] ?? 2) - (rank[b.priority as keyof typeof rank] ?? 2));
  }
  return sorted;
}

function velocityBars(sentiment: { positive: number; neutral: number; negative: number }) {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative || 1;
  const base = [
    Math.round((sentiment.positive / total) * 30 + 15),
    Math.round((sentiment.positive / total) * 45 + 20),
    Math.round((sentiment.neutral / total) * 35 + 18),
    Math.round((sentiment.positive / total) * 60 + 25),
    Math.round((sentiment.positive / total) * 80 + 30),
    Math.round((sentiment.positive / total) * 70 + 28),
    Math.round((sentiment.positive / total) * 95 + 35),
    Math.round((sentiment.positive / total) * 85 + 32),
    Math.round((sentiment.positive / total) * 65 + 22),
    Math.round((sentiment.neutral / total) * 50 + 18),
    Math.round((sentiment.negative / total) * 40 + 12),
    Math.round((sentiment.negative / total) * 20 + 8),
  ];
  return base.map((h) => Math.min(95, Math.max(12, h)));
}

function aiPanelVariant(index: number): 'primary' | 'secondary' | 'tertiary' {
  const variants: Array<'primary' | 'secondary' | 'tertiary'> = ['primary', 'secondary', 'tertiary'];
  return variants[index % 3];
}

function mapIntent(intent: string): Intent {
  if (intent === 'purchase') return 'purchase';
  if (intent === 'question' || intent === 'inquiry') return 'inquiry';
  if (intent === 'complaint') return 'complaint';
  if (intent === 'praise' || intent === 'feedback') return 'feedback';
  return 'other';
}

function savedToAnalysisState(saved: ProductSavedAnalysis): AnalysisState {
  return {
    id: saved.id,
    analyzedAt: saved.analyzedAt,
    summary: saved.summary,
    purchaseLeads: saved.purchaseLeads,
    inquiries: saved.inquiries,
    autoReplied: saved.autoReplied,
    totalComments: saved.totalComments,
    sentiment: saved.sentiment,
    productReception: saved.productReception,
    insights: saved.insights.map((i) => ({ ...i, text: i.text })),
  };
}

function mergeRecordsIntoInsights(
  insights: CommentInsight[],
  records: ProductCommentRecord[]
): CommentInsight[] {
  const byComment = new Map(records.map((r) => [r.commentId, r]));
  return insights.map((ins) => {
    const rec = byComment.get(ins.commentId);
    if (!rec) return ins;
    return {
      ...ins,
      platform: ins.platform || rec.platform,
      author: ins.author || rec.author,
      text: ins.text || rec.commentText,
      parentCommentId: ins.parentCommentId || rec.parentCommentId,
      parentAuthor: ins.parentAuthor || rec.parentAuthor,
      isReply: ins.isReply ?? rec.isReply,
      intent: ins.intent || rec.intent || 'other',
      sentiment: ins.sentiment || rec.sentiment,
      productFit: ins.productFit || rec.productFit,
      shouldReply: ins.shouldReply ?? rec.shouldReply ?? false,
      priority: ins.priority || rec.priority || 'low',
      suggestedReply: ins.suggestedReply || rec.suggestedReply || '',
      reason: ins.reason || rec.reason || '',
      replyStatus: ins.replyStatus ?? rec.replyStatus ?? null,
      repliedAt: rec.repliedAt,
      saved: true,
    };
  });
}

function recordsToInsights(records: ProductCommentRecord[]): CommentInsight[] {
  return records.map((r) => ({
    commentId: r.commentId,
    postId: r.postId,
    author: r.author,
    text: r.commentText,
    platform: r.platform,
    parentCommentId: r.parentCommentId,
    parentAuthor: r.parentAuthor,
    isReply: r.isReply,
    intent: r.intent || 'other',
    sentiment: r.sentiment,
    productFit: r.productFit,
    shouldReply: r.shouldReply ?? false,
    priority: r.priority || 'low',
    suggestedReply: r.suggestedReply || '',
    reason: r.reason || '',
    replyStatus: r.replyStatus ?? null,
    repliedAt: r.repliedAt,
    saved: true,
  }));
}

function ProductAnalysisContent() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [rawComments, setRawComments] = useState<RawComment[]>([]);
  const [platformCounts, setPlatformCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ publishedPosts: 0, totalComments: 0, savedReplies: 0 });
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<
    Array<{
      id: string;
      analyzedAt: string;
      autoReplied: number;
      purchaseLeads: number;
      summary: string;
      commentCount?: number;
      totalComments?: number;
      productReception?: ProductReceptionReport;
    }>
  >([]);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentSort, setCommentSort] = useState<CommentSort>('impactful');
  const [threadRootId, setThreadRootId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadingProducts(false);
      return;
    }
    apiClient
      .getProducts(token)
      .then((res) => setProducts(res.products || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load products'))
      .finally(() => setLoadingProducts(false));
  }, [token]);

  const selectProduct = useCallback(
    async (product: Product) => {
      if (!token) return;
      setSelectedProduct(product);
      setError(null);
      setLoadingDetail(true);
      try {
        const res = await apiClient.getProductAnalysis(token, product.id);
        setRawComments(res.comments || []);
        setPlatformCounts(res.stats?.platformCounts || {});
        setStats({
          publishedPosts: res.stats?.publishedPosts ?? 0,
          totalComments: res.stats?.totalComments ?? 0,
          savedReplies: res.stats?.savedReplies ?? 0,
        });
        setLastAnalyzedAt(res.product?.lastAnalyzedAt || res.savedAnalysis?.analyzedAt || null);
        setAnalysisHistory(res.analysisHistory || []);

        if (res.savedAnalysis) {
          let state = savedToAnalysisState(res.savedAnalysis);
          state.productReception = res.savedAnalysis.productReception || res.productReception || state.productReception;
          if (res.commentRecords?.length) {
            state = {
              ...state,
              insights: mergeRecordsIntoInsights(state.insights, res.commentRecords),
            };
          }
          setAnalysis(state);
        } else if (res.commentRecords?.length) {
          setAnalysis({
            summary: 'Saved reply records from Firebase',
            purchaseLeads: res.commentRecords.filter((r) => r.intent === 'purchase').length,
            inquiries: res.commentRecords.filter((r) => r.intent === 'question' || r.intent === 'inquiry').length,
            autoReplied: res.commentRecords.filter((r) => r.replyStatus?.sent).length,
            totalComments: res.comments?.length ?? 0,
            sentiment: { positive: 0, neutral: 0, negative: 0 },
            insights: recordsToInsights(res.commentRecords),
          });
        } else {
          setAnalysis(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load comments');
        setRawComments([]);
        setPlatformCounts({});
        setAnalysis(null);
      } finally {
        setLoadingDetail(false);
      }
    },
    [token]
  );

  async function runAiAnalysis() {
    if (!token || !selectedProduct) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await apiClient.analyzeProductComments(token, selectedProduct.id, { autoReply: true });
      const a = res.analysis;
      setAnalysis({
        ...savedToAnalysisState(a),
        productReception: a.productReception,
      });
      setLastAnalyzedAt(a.analyzedAt);
      const refresh = await apiClient.getProductAnalysis(token, selectedProduct.id);
      setRawComments(refresh.comments || []);
      setStats({
        publishedPosts: refresh.stats?.publishedPosts ?? 0,
        totalComments: refresh.stats?.totalComments ?? 0,
        savedReplies: refresh.stats?.savedReplies ?? a.autoReplied,
      });
      setAnalysisHistory((prev) => [
        {
          id: a.id,
          analyzedAt: a.analyzedAt,
          autoReplied: a.autoReplied,
          purchaseLeads: a.purchaseLeads,
          summary: a.summary,
          commentCount: a.totalComments,
          productReception: a.productReception,
        },
        ...prev.filter((h) => h.id !== a.id),
      ].slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed. Check GEMINI_API_KEY on the API.');
    } finally {
      setAnalyzing(false);
    }
  }

  const insightByComment = new Map(analysis?.insights.map((i) => [i.commentId, i]) ?? []);

  const displayComments: Array<RawComment & Partial<CommentInsight>> =
    rawComments.length > 0
      ? rawComments.map((c) => {
          const ins = insightByComment.get(c.commentId);
          if (ins) {
            return {
              ...c,
              ...ins,
              text: ins.text || c.text,
            };
          }
          return {
            ...c,
            intent: 'other',
            shouldReply: false,
            priority: 'low',
            suggestedReply: '',
            reason: '',
            replyStatus: null,
          };
        })
      : (analysis?.insights || []).map((ins) => ({
          commentId: ins.commentId,
          postId: ins.postId || '',
          author: ins.author || 'User',
          text: ins.text || '',
          platform: ins.platform || 'unknown',
          parentCommentId: ins.parentCommentId,
          parentAuthor: ins.parentAuthor,
          isReply: ins.isReply,
          intent: ins.intent,
          sentiment: ins.sentiment,
          productFit: ins.productFit,
          shouldReply: ins.shouldReply,
          priority: ins.priority,
          suggestedReply: ins.suggestedReply,
          reason: ins.reason,
          replyStatus: ins.replyStatus,
          repliedAt: ins.repliedAt,
          saved: ins.saved,
        }));

  const intelligenceComments = useMemo(
    () => sortByMode(displayComments, commentSort),
    [displayComments, commentSort]
  );

  const engagementRate = useMemo(() => {
    if (!analysis || stats.totalComments === 0) return null;
    const leads = analysis.purchaseLeads + analysis.inquiries;
    return Math.min(99.9, Math.round((leads / Math.max(stats.totalComments, 1)) * 1000) / 10);
  }, [analysis, stats.totalComments]);

  const sentimentScore = analysis?.productReception?.score ??
    (analysis
      ? Math.round(
          ((analysis.sentiment.positive * 100) /
            Math.max(analysis.sentiment.positive + analysis.sentiment.neutral + analysis.sentiment.negative, 1))
        )
      : null);

  const bars = analysis ? velocityBars(analysis.sentiment) : velocityBars({ positive: 3, neutral: 2, negative: 1 });

  const threadComments = displayComments.map((c) => ({
    commentId: c.commentId,
    author: c.author || 'User',
    text: c.text || '',
    platform: c.platform,
    isReply: c.isReply,
    parentCommentId: c.parentCommentId,
    parentAuthor: c.parentAuthor,
    sentiment: c.sentiment,
    intent: c.intent,
    suggestedReply: c.suggestedReply,
    replyStatus: c.replyStatus,
  }));

  return (
    <div className={styles.workspace}>
      {error && (
        <div className="absolute left-1/2 top-4 z-50 flex max-w-lg -translate-x-1/2 items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      <section className={styles.feedColumn}>
        <div className="border-b border-white/10 px-6 py-5 md:px-10">
          <h2 className="text-lg font-semibold">Social feed</h2>
          <p className="mt-1 text-sm text-[#cbc3d7]">
            Monitoring {stats.publishedPosts || products.length} active campaign
            {(stats.publishedPosts || products.length) === 1 ? '' : 's'}
          </p>
        </div>
        <div className={`${styles.customScrollbar} flex-1 space-y-4 overflow-y-auto p-4`}>
          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#d0bcff]" />
            </div>
          ) : products.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-[#958ea0]">
              <p>No products yet.</p>
              <Link href="/products" className="mt-2 inline-block text-[#4cd7f6] hover:underline">
                Create a product
              </Link>
            </div>
          ) : (
            products.map((product) => {
              const plat = primaryPlatform(
                product.id === selectedProduct?.id ? platformCounts : {}
              );
              const pStyle = PLATFORM_STYLES[plat] || {
                label: plat,
                className: 'text-[#d0bcff]',
                accent: 'text-[#d0bcff]',
                icon: 'generic' as const,
              };
              const active = selectedProduct?.id === product.id;
              const thumb = product.images?.[0]?.url;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => selectProduct(product)}
                  className={`${styles.glassCard} w-full cursor-pointer rounded-xl p-4 text-left transition-all hover:bg-[#2c2832]/40 ${
                    active ? styles.activeFeedItem : styles.feedItemDimmed
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#211e27]">
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#958ea0]">
                          <MessageCircle className="h-8 w-8 opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between">
                        <div className={`flex items-center gap-1 ${pStyle.accent}`}>
                          {platformIcon(pStyle.icon)}
                          <span className={styles.labelCaps}>{pStyle.label}</span>
                        </div>
                        {product.lastAnalyzedAt && (
                          <span className={`${styles.labelCaps} text-[#958ea0]`}>
                            {formatRelative(product.lastAnalyzedAt)}
                          </span>
                        )}
                      </div>
                      <h3 className="truncate text-sm font-bold">{product.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-[#cbc3d7]">
                        {product.description?.slice(0, 120) || `₹${product.price.toLocaleString('en-IN')} · ${product.status}`}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className={`${styles.analysisColumn} ${styles.customScrollbar}`}>
        {!selectedProduct ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-[#958ea0]">
            <MessageCircle className="h-12 w-12 opacity-30" />
            <p className="text-sm">Select a product from the feed to view engagement analytics.</p>
          </div>
        ) : loadingDetail ? (
          <div className="flex h-full items-center justify-center gap-2 text-[#958ea0]">
            <Loader2 className="h-5 w-5 animate-spin text-[#d0bcff]" />
            Loading comments…
          </div>
        ) : (
          <div className="space-y-8 p-6 md:p-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-block rounded-full border border-[#4cd7f6]/20 bg-[#4cd7f6]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#4cd7f6]">
                  {stats.publishedPosts > 0 ? 'Active campaign' : 'Product'}
                </span>
                <h2 className="mt-2 text-2xl font-bold">{selectedProduct.title}</h2>
                {analysis?.summary && (
                  <p className="mt-2 max-w-2xl text-sm text-[#cbc3d7]">{analysis.summary}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.publicUrl && (
                  <a
                    href={selectedProduct.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${styles.btnGhost} rounded-lg px-4 py-2 transition`}
                  >
                    View product
                  </a>
                )}
                <button
                  type="button"
                  onClick={runAiAnalysis}
                  disabled={analyzing || (rawComments.length === 0 && !analysis?.insights.length)}
                  className={`${styles.btnPrimary} flex items-center gap-2 rounded-lg px-4 py-2 disabled:opacity-50`}
                >
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {analyzing ? 'Analyzing…' : 'Generate report'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className={`${styles.glassCard} ${styles.glowAccent} rounded-2xl p-6`}>
                <div className="mb-4 flex items-center justify-between">
                  <span className={`${styles.labelCaps} text-[#cbc3d7]`}>Engagement rate</span>
                  <TrendingUp className="h-5 w-5 text-[#d0bcff]" />
                </div>
                <div className={`${styles.metricValue} text-[#d0bcff]`}>
                  {engagementRate != null ? `${engagementRate}%` : '—'}
                </div>
                <div className="mt-2 text-sm text-[#4fdbc8]">
                  {analysis ? `+${analysis.purchaseLeads} purchase leads` : 'Run analysis to compute'}
                </div>
              </div>
              <div className={`${styles.glassCard} rounded-2xl p-6`}>
                <div className="mb-4 flex items-center justify-between">
                  <span className={`${styles.labelCaps} text-[#cbc3d7]`}>Total comments</span>
                  <Heart className="h-5 w-5 text-[#4cd7f6]" />
                </div>
                <div className={`${styles.metricValue} text-[#e7e0ed]`}>{stats.totalComments}</div>
                <div className="mt-2 flex gap-2">
                  <span className={`${styles.labelCaps} text-[#958ea0]`}>{stats.savedReplies} AI replies</span>
                  <span className={`${styles.labelCaps} text-[#958ea0]`}>{stats.publishedPosts} posts</span>
                </div>
              </div>
              <div className={`${styles.glassCard} rounded-2xl bg-gradient-to-br from-[#4fdbc8]/10 to-transparent p-6`}>
                <div className="mb-4 flex items-center justify-between">
                  <span className={`${styles.labelCaps} text-[#cbc3d7]`}>Sentiment score</span>
                  <Smile className="h-5 w-5 text-[#4fdbc8]" />
                </div>
                <div className={`${styles.metricValue} text-[#4fdbc8]`}>
                  {sentimentScore != null ? `${sentimentScore}%` : '—'}
                </div>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#211e27]">
                  <div
                    className="h-full bg-[#4fdbc8]"
                    style={{ width: `${sentimentScore ?? 0}%` }}
                  />
                </div>
              </div>
            </div>

            {analysis?.productReception && (
              <ProductReceptionCard report={analysis.productReception} />
            )}

            {rawComments.length === 0 && !analysis?.insights.length ? (
              <div className={`${styles.glassCard} rounded-2xl p-10 text-center`}>
                <MessageCircle className="mx-auto mb-3 h-10 w-10 text-[#958ea0]/50" />
                <p className="text-sm text-[#cbc3d7]">No comments on published posts yet.</p>
                <Link
                  href="/posts"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#4cd7f6] hover:underline"
                >
                  Publish posts <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className={`${styles.glassCard} overflow-hidden rounded-2xl`}>
                <div className="flex items-center justify-between border-b border-white/10 bg-[#211e27]/30 px-6 py-4">
                  <h3 className="font-bold">Comment intelligence</h3>
                  <div className="flex items-center gap-2">
                    <span className={`${styles.labelCaps} text-[#958ea0]`}>Sort by:</span>
                    <select
                      value={commentSort}
                      onChange={(e) => setCommentSort(e.target.value as CommentSort)}
                      className="cursor-pointer border-none bg-transparent text-xs font-semibold uppercase tracking-wider text-[#4cd7f6] outline-none"
                    >
                      <option value="impactful">Impactful</option>
                      <option value="recent">Recent</option>
                      <option value="negative">Negative</option>
                    </select>
                  </div>
                </div>
                <div className="divide-y divide-white/10">
                  {intelligenceComments.map((comment, idx) => {
                    const variant = aiPanelVariant(idx);
                    const panelClass =
                      variant === 'primary'
                        ? styles.aiReplyPanelPrimary
                        : variant === 'secondary'
                          ? styles.aiReplyPanelSecondary
                          : styles.aiReplyPanelTertiary;
                    const accent =
                      variant === 'primary'
                        ? 'text-[#d0bcff]'
                        : variant === 'secondary'
                          ? 'text-[#4cd7f6]'
                          : 'text-[#4fdbc8]';
                    const btnAccent =
                      variant === 'primary'
                        ? 'bg-[#d0bcff] text-[#3c0091]'
                        : variant === 'secondary'
                          ? 'bg-[#4cd7f6] text-[#003640]'
                          : 'bg-[#4fdbc8] text-[#003731]';
                    const replyText = comment.replyStatus?.replyText || comment.suggestedReply;
                    const status = comment.replyStatus;
                    const rootId = comment.isReply
                      ? comment.parentCommentId || comment.commentId
                      : comment.commentId;

                    return (
                      <div
                        key={comment.commentId}
                        className="flex flex-col gap-6 p-6 transition hover:bg-white/5 md:flex-row"
                      >
                        <div className="flex-1">
                          <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#03b5d3] text-xs font-bold text-[#00424e]">
                              {initials(comment.author || 'U')}
                            </div>
                            <div>
                              <div className="text-sm font-bold">{comment.author}</div>
                              <div className={`${styles.labelCaps} text-[#958ea0]`}>
                                {mapIntent(comment.intent || 'other')} · {comment.platform}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed">{comment.text}</p>
                          <div className="mt-4 flex flex-wrap gap-4">
                            {comment.sentiment && <SentimentBadge sentiment={comment.sentiment} />}
                            {status && <ReplyStatusBanner status={status} />}
                            <button
                              type="button"
                              onClick={() => setThreadRootId(rootId)}
                              className={`ml-auto flex items-center gap-1 ${styles.labelCaps} text-[#4cd7f6] hover:underline`}
                            >
                              <GitBranch className="h-3.5 w-3.5" />
                              View full thread
                            </button>
                          </div>
                        </div>
                        {replyText && (
                          <div className={`w-full md:w-80 ${styles.aiReplyPanel} ${panelClass} p-4`}>
                            <div className={`mb-2 flex items-center gap-2 ${accent}`}>
                              <Bot className="h-3.5 w-3.5" />
                              <span className={styles.labelCaps}>AI suggested reply</span>
                            </div>
                            <p className="font-mono text-xs italic leading-relaxed text-[#cbc3d7]">
                              &ldquo;{replyText}&rdquo;
                            </p>
                            <div className="mt-4 flex gap-2">
                              <button
                                type="button"
                                className={`flex-1 rounded border py-2 text-[10px] font-semibold uppercase ${accent} border-current/30 bg-white/5`}
                              >
                                Edit &amp; send
                              </button>
                              <button
                                type="button"
                                disabled={!!status?.sent}
                                className={`flex-1 rounded py-2 text-[10px] font-bold uppercase ${btnAccent} disabled:opacity-50`}
                              >
                                {status?.sent ? 'Sent' : 'Auto-reply'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {displayComments.length > intelligenceComments.length && (
                  <div className="border-t border-white/10 bg-[#211e27]/30 px-6 py-4 text-center">
                    <span className={`${styles.labelCaps} text-[#958ea0]`}>
                      +{displayComments.length - intelligenceComments.length} thread replies in full view
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className={`${styles.glassCard} rounded-2xl p-6`}>
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <h3 className="font-bold">Engagement velocity</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#d0bcff]" />
                    <span className={styles.labelCaps}>{selectedProduct.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#4cd7f6] opacity-30" />
                    <span className={styles.labelCaps}>Baseline</span>
                  </div>
                </div>
              </div>
              <div className="flex h-48 items-end gap-2 px-2">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="group relative flex-1 rounded-t-sm bg-[#d0bcff]/30 transition hover:bg-[#d0bcff]/60"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className={`mt-4 flex justify-between ${styles.labelCaps} text-[#958ea0]`}>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span>00:00</span>
              </div>
            </div>

            {lastAnalyzedAt && (
              <p className={`${styles.labelCaps} text-center text-[#958ea0]`}>
                Last analyzed {formatRelative(lastAnalyzedAt)} · {formatDateTime(lastAnalyzedAt)}
              </p>
            )}
          </div>
        )}
      </section>

      <CommentThreadModal
        open={!!threadRootId}
        onClose={() => setThreadRootId(null)}
        productTitle={selectedProduct?.title || ''}
        campaignCaption={analysis?.summary}
        comments={threadComments}
        rootCommentId={threadRootId}
      />
    </div>
  );
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function formatRelative(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return iso;
  }
}

function PlatformTag({ platform, count }: { platform: string; count?: number }) {
  const key = platform.toLowerCase();
  const style = PLATFORM_STYLES[key] || {
    label: platform,
    className: 'text-[#d0bcff]',
    accent: 'text-[#d0bcff]',
    icon: 'generic' as const,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${style.className}`}>
      {style.label}
      {count != null && <span className="opacity-70"> ({count})</span>}
    </span>
  );
}

function ReplyStatusBanner({ status }: { status: ReplyStatus }) {
  if (status.sent && status.skipped) {
    const label = PLATFORM_STYLES[status.platform.toLowerCase()]?.label || status.platform;
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400/80" />
        Already replied on {label} — no duplicate message sent
      </div>
    );
  }
  if (status.sent) {
    const label = PLATFORM_STYLES[status.platform.toLowerCase()]?.label || status.platform;
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Replied on {label} · saved to Firebase
      </div>
    );
  }
  if (status.error) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Could not auto-reply on {status.platform}: {status.error}
        </span>
      </div>
    );
  }
  return null;
}

function ProductReceptionCard({ report }: { report: ProductReceptionReport }) {
  const verdictStyles: Record<string, string> = {
    good: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
    mixed: 'border-amber-500/50 bg-amber-500/15 text-amber-200',
    needs_attention: 'border-red-500/50 bg-red-500/15 text-red-300',
  };
  const verdictLabel: Record<string, string> = {
    good: 'Good fit for customers',
    mixed: 'Mixed reception',
    needs_attention: 'Needs attention',
  };
  return (
    <div className={`${styles.glassCard} rounded-2xl border border-[#d0bcff]/30 bg-gradient-to-br from-[#d0bcff]/10 to-transparent p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <TrendingUp className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Product reception report</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Based on customer feedback</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-violet-300">{report.score}</p>
          <p className="text-xs text-muted-foreground">/ 100</p>
        </div>
      </div>
      <span
        className={`inline-block rounded-full border px-3 py-1.5 text-xs font-semibold ${
          verdictStyles[report.verdict] || verdictStyles.mixed
        }`}
      >
        {verdictLabel[report.verdict] || report.verdict}
      </span>
      <p className="mt-4 text-sm leading-relaxed text-foreground/90">{report.summary}</p>
      {report.strengths.length > 0 && (
        <ul className="mt-4 space-y-2">
          <li className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ThumbsUp className="h-4 w-4" /> Strengths
          </li>
          {report.strengths.map((s, i) => (
            <li key={i} className="ml-6 text-sm text-muted-foreground">
              • {s}
            </li>
          ))}
        </ul>
      )}
      {report.concerns.length > 0 && (
        <ul className="mt-4 space-y-2">
          <li className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <ThumbsDown className="h-4 w-4" /> Concerns
          </li>
          {report.concerns.map((c, i) => (
            <li key={i} className="ml-6 text-sm text-muted-foreground">
              • {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment?: string }) {
  if (!sentiment) return null;
  const styles: Record<string, string> = {
    positive: 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40',
    neutral: 'bg-gray-500/25 text-gray-300 border border-gray-500/40',
    negative: 'bg-red-500/25 text-red-300 border border-red-500/40',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${styles[sentiment] || styles.neutral}`}>
      {sentiment}
    </span>
  );
}

function ProductFitBadge({ fit }: { fit: string }) {
  const styles: Record<string, string> = {
    good_fit: 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40',
    uncertain: 'bg-amber-500/25 text-amber-200 border border-amber-500/40',
    poor_fit: 'bg-red-500/25 text-red-300 border border-red-500/40',
  };
  const labels: Record<string, string> = {
    good_fit: 'Good fit',
    uncertain: 'Uncertain',
    poor_fit: 'Poor fit',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[fit] || styles.uncertain}`}>
      {labels[fit] || fit}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className="rounded-full bg-white/15 border border-white/20 px-2.5 py-1 text-xs font-medium capitalize">
      {priority}
    </span>
  );
}

function IntentBadge({ intent }: { intent: Intent }) {
  const colors: Record<string, string> = {
    purchase: 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40',
    inquiry: 'bg-blue-500/25 text-blue-300 border border-blue-500/40',
    feedback: 'bg-purple-500/25 text-purple-300 border border-purple-500/40',
    complaint: 'bg-red-500/25 text-red-300 border border-red-500/40',
    praise: 'bg-yellow-500/25 text-yellow-300 border border-yellow-500/40',
    question: 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40',
    other: 'bg-gray-500/25 text-gray-300 border border-gray-500/40',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${colors[intent] || colors.other}`}>
      {intent}
    </span>
  );
}

export default function ProductAnalysisPage() {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-[#211e27]" />}>
      <ProductAnalysisContent />
    </Suspense>
  );
}
