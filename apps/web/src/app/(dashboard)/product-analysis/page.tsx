'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { AnalysisGraphModal } from '@/components/product-analysis/analysis-graph-modal';
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
    className: 'text-[brand-facebook]',
    accent: 'text-[brand-facebook]',
    icon: 'instagram',
  },
  facebook: {
    label: 'Facebook',
    className: 'text-brand-instagram',
    accent: 'text-brand-instagram',
    icon: 'facebook',
  },
  youtube: {
    label: 'YouTube',
    className: 'text-brand-instagram',
    accent: 'text-brand-instagram',
    icon: 'youtube',
  },
  tiktok: {
    label: 'TikTok',
    className: 'text-[brand-facebook]',
    accent: 'text-[brand-facebook]',
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

type DisplayComment = RawComment & Partial<CommentInsight>;

type ThreadedCommentRow = DisplayComment & {
  depth: number;
  replyToAuthor?: string;
  threadRootId: string;
};

function sortByMode(comments: DisplayComment[], mode: CommentSort) {
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

/** Nest replies under parent comments (one table row per thread level, not duplicate top-level rows). */
function buildThreadedCommentRows(comments: DisplayComment[], mode: CommentSort): ThreadedCommentRow[] {
  const byId = new Map(comments.map((c) => [c.commentId, c]));
  const childrenByParent = new Map<string, DisplayComment[]>();

  for (const c of comments) {
    const parentId = c.parentCommentId?.trim();
    if (!parentId) continue;
    const list = childrenByParent.get(parentId) ?? [];
    list.push(c);
    childrenByParent.set(parentId, list);
  }

  const roots = comments.filter((c) => !c.parentCommentId?.trim());

  const resolveThreadRoot = (commentId: string): string => {
    let id = commentId;
    let cur = byId.get(id);
    while (cur?.parentCommentId && byId.has(cur.parentCommentId)) {
      id = cur.parentCommentId;
      cur = byId.get(id);
    }
    return id;
  };

  const appendChildren = (parentId: string, rootId: string, depth: number): ThreadedCommentRow[] => {
    const kids = childrenByParent.get(parentId) ?? [];
    const rows: ThreadedCommentRow[] = [];
    for (const kid of kids) {
      const parent = byId.get(parentId);
      rows.push({
        ...kid,
        depth,
        replyToAuthor: kid.parentAuthor || parent?.author,
        threadRootId: rootId,
      });
      rows.push(...appendChildren(kid.commentId, rootId, depth + 1));
    }
    return rows;
  };

  let sortedRoots = sortByMode(roots, mode);
  if (mode === 'recent') {
    sortedRoots = [...sortedRoots].reverse();
  }

  const rows: ThreadedCommentRow[] = [];
  const seen = new Set<string>();

  for (const root of sortedRoots) {
    rows.push({ ...root, depth: 0, threadRootId: root.commentId });
    seen.add(root.commentId);
    for (const child of appendChildren(root.commentId, root.commentId, 1)) {
      rows.push(child);
      seen.add(child.commentId);
    }
  }

  for (const c of comments) {
    if (!seen.has(c.commentId)) {
      rows.push({
        ...c,
        depth: c.isReply ? 1 : 0,
        replyToAuthor: c.parentAuthor,
        threadRootId: resolveThreadRoot(c.commentId),
      });
    }
  }

  return rows;
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

function savedToAnalysisState(
  saved: Partial<ProductSavedAnalysis> & Pick<ProductSavedAnalysis, 'summary' | 'analyzedAt'>
): AnalysisState {
  const insights = saved.insights ?? [];
  return {
    id: saved.id,
    analyzedAt: saved.analyzedAt,
    summary: saved.summary,
    purchaseLeads: saved.purchaseLeads ?? 0,
    inquiries: saved.inquiries ?? 0,
    autoReplied: saved.autoReplied ?? 0,
    totalComments: saved.totalComments ?? insights.length,
    sentiment: saved.sentiment ?? { positive: 0, neutral: 0, negative: 0 },
    productReception: saved.productReception,
    insights: insights.map((i) => ({ ...i, text: i.text })),
  };
}

function mergeRecordsIntoInsights(
  insights: CommentInsight[] | undefined,
  records: ProductCommentRecord[]
): CommentInsight[] {
  const base = insights ?? [];
  const byComment = new Map(records.map((r) => [r.commentId, r]));
  return base.map((ins) => {
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
  const [liveSync, setLiveSync] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [platformErrors, setPlatformErrors] = useState<Array<{ platform: string; postId?: string; error: string }>>([]);

  const SYNC_INTERVAL_MS = 25000;
  const syncInFlightRef = useRef(false);

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

  const applySyncResult = useCallback(
    (res: Awaited<ReturnType<typeof apiClient.syncProductAnalysis>>) => {
      setRawComments(res.comments || []);
      setLastSyncedAt(res.syncedAt);
      const sentimentFromSync = res.sentiment
        ? {
            positive: res.sentiment.positive,
            neutral: res.sentiment.neutral,
            negative: res.sentiment.negative,
          }
        : undefined;

      if (res.analysis) {
        const syncInsights = (res.insights ?? []).map((i) => ({ ...i, text: i.text }));
        const state = savedToAnalysisState({
          ...res.analysis,
          insights: syncInsights,
          sentiment: res.analysis.sentiment ?? {
            positive: res.sentiment?.positive ?? 0,
            neutral: res.sentiment?.neutral ?? 0,
            negative: res.sentiment?.negative ?? 0,
          },
        });
        setAnalysis({
          ...state,
          purchaseLeads: res.sentiment?.purchase ?? state.purchaseLeads,
          inquiries: res.sentiment?.inquiry ?? state.inquiries,
          sentiment: sentimentFromSync ?? state.sentiment,
          insights: syncInsights.length ? syncInsights : state.insights,
        });
        setLastAnalyzedAt(res.analysis.analyzedAt);
      } else if ((res.insights ?? []).length) {
        setAnalysis((prev) => ({
          summary: prev?.summary || 'Live sync — saved to Firebase',
          purchaseLeads: res.sentiment?.purchase ?? res.purchaseLeads,
          inquiries: res.sentiment?.inquiry ?? prev?.inquiries ?? 0,
          autoReplied: (prev?.autoReplied ?? 0) + res.autoReplied,
          totalComments: res.totalComments,
          sentiment: sentimentFromSync ?? prev?.sentiment ?? { positive: 0, neutral: 0, negative: 0 },
          insights: (res.insights ?? []).map((i) => ({ ...i, text: i.text })),
          productReception: prev?.productReception,
        }));
      }
      setStats((s) => ({
        ...s,
        totalComments: res.totalComments,
        savedReplies: Math.max(s.savedReplies, res.insights?.filter((i) => i.replyStatus?.sent).length ?? 0),
      }));
      if (res.platformErrors?.length) {
        setPlatformErrors(res.platformErrors);
      }
    },
    []
  );

  const selectProduct = useCallback(
    async (product: Product) => {
      if (!token) return;
      setSelectedProduct(product);
      setError(null);
      setLoadingDetail(true);
      if (syncInFlightRef.current) {
        setLoadingDetail(false);
        return;
      }
      syncInFlightRef.current = true;
      try {
        const syncRes = await apiClient.syncProductAnalysis(token, product.id, {
          autoAnalyze: true,
          autoReply: liveSync,
        });
        if (syncRes.platformErrors?.length) {
          setPlatformErrors(syncRes.platformErrors);
        }
        applySyncResult(syncRes);

        const res = await apiClient.getProductAnalysis(token, product.id);
        setRawComments(res.comments || []);
        setPlatformCounts(res.stats?.platformCounts || {});
        setStats({
          publishedPosts: res.stats?.publishedPosts ?? 0,
          totalComments: res.stats?.totalComments ?? 0,
          savedReplies: res.stats?.savedReplies ?? 0,
        });
        setLastAnalyzedAt(res.product?.lastAnalyzedAt || res.savedAnalysis?.analyzedAt || null);
        setLastSyncedAt(res.product?.lastSyncedAt || syncRes.syncedAt || null);
        setAnalysisHistory(res.analysisHistory || []);
        if (res.platformErrors?.length) {
          setPlatformErrors(res.platformErrors);
        }

        const apiSentiment = res.sentiment;

        if (res.savedAnalysis) {
          const runInsights =
            res.savedAnalysis.insights?.length
              ? res.savedAnalysis.insights
              : (res.insights ?? []);
          let state = savedToAnalysisState({
            ...res.savedAnalysis,
            insights: runInsights,
          });
          state.productReception = res.savedAnalysis.productReception || res.productReception || state.productReception;
          if (apiSentiment) {
            state.sentiment = {
              positive: apiSentiment.positive,
              neutral: apiSentiment.neutral,
              negative: apiSentiment.negative,
            };
            state.purchaseLeads = apiSentiment.purchase;
            state.inquiries = apiSentiment.inquiry;
          }
          if (res.commentRecords?.length) {
            state = {
              ...state,
              insights: mergeRecordsIntoInsights(state.insights, res.commentRecords),
            };
          } else if (!state.insights.length && (syncRes.insights ?? []).length) {
            state.insights = (syncRes.insights ?? []).map((i) => ({ ...i, text: i.text }));
          }
          setAnalysis(state);
        } else if (res.commentRecords?.length) {
          setAnalysis({
            summary: 'Comments & replies loaded from Firebase',
            purchaseLeads:
              apiSentiment?.purchase ?? res.commentRecords.filter((r) => r.intent === 'purchase').length,
            inquiries:
              apiSentiment?.inquiry ??
              res.commentRecords.filter((r) => r.intent === 'question' || r.intent === 'inquiry').length,
            autoReplied: res.commentRecords.filter((r) => r.replyStatus?.sent).length,
            totalComments: res.comments?.length ?? 0,
            sentiment: apiSentiment
              ? { positive: apiSentiment.positive, neutral: apiSentiment.neutral, negative: apiSentiment.negative }
              : { positive: 0, neutral: 0, negative: 0 },
            insights: recordsToInsights(res.commentRecords),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product analysis');
        setRawComments([]);
        setPlatformCounts({});
        setAnalysis(null);
      } finally {
        syncInFlightRef.current = false;
        setLoadingDetail(false);
      }
    },
    [token, liveSync, applySyncResult]
  );

  useEffect(() => {
    if (loadingProducts || products.length === 0 || selectedProduct) return;
    void selectProduct(products[0]);
  }, [loadingProducts, products, selectedProduct, selectProduct]);

  const runLiveSync = useCallback(
    async (productId: string, silent = false) => {
      if (!token || syncInFlightRef.current) return;
      syncInFlightRef.current = true;
      if (!silent) setSyncing(true);
      try {
        const res = await apiClient.syncProductAnalysis(token, productId, {
          autoAnalyze: true,
          autoReply: true,
        });
        applySyncResult(res);
        if (!silent && res.newComments > 0) {
          setError(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Live sync failed';
        if (!silent || !/fetch|network|connection refused/i.test(msg)) {
          setError(msg);
        }
      } finally {
        syncInFlightRef.current = false;
        if (!silent) setSyncing(false);
      }
    },
    [token, applySyncResult]
  );

  useEffect(() => {
    if (!token || !selectedProduct || !liveSync) return;
    const id = selectedProduct.id;
    const timer = setInterval(() => void runLiveSync(id, true), SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [token, selectedProduct?.id, liveSync, runLiveSync]);

  async function runCommentAction(
    comment: RawComment & Partial<CommentInsight>,
    action: 'buy' | 'connect' | 'reply'
  ) {
    if (!token || !selectedProduct) return;
    setActionLoadingId(comment.commentId);
    setError(null);
    try {
      const res = await apiClient.productCommentAction(token, selectedProduct.id, {
        action,
        commentId: comment.commentId,
        postId: comment.postId,
        platform: comment.platform,
        customerMessage: comment.text,
        customerName: comment.author,
        message: action === 'reply' ? comment.suggestedReply : undefined,
      });
      if (selectedProduct) {
        const refresh = await apiClient.getProductAnalysis(token, selectedProduct.id);
        setRawComments(refresh.comments || []);
        if (refresh.savedAnalysis) {
          let state = savedToAnalysisState(refresh.savedAnalysis);
          if (refresh.commentRecords?.length) {
            state = { ...state, insights: mergeRecordsIntoInsights(state.insights, refresh.commentRecords) };
          }
          setAnalysis(state);
        }
      }
      if (action === 'buy' && res.checkoutUrl) {
        setAnalysis((prev) =>
          prev
            ? {
                ...prev,
                insights: (prev.insights ?? []).map((ins) =>
                  ins.commentId === comment.commentId
                    ? {
                        ...ins,
                        replyStatus: {
                          sent: true,
                          platform: comment.platform || 'unknown',
                          replyText: res.suggestedReply,
                          checkoutUrl: res.checkoutUrl,
                        },
                      }
                    : ins
                ),
              }
            : prev
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoadingId(null);
    }
  }

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

  const displayComments: DisplayComment[] =
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
    () => buildThreadedCommentRows(displayComments, commentSort),
    [displayComments, commentSort]
  );

  const threadReplyCount = displayComments.filter((c) => c.isReply).length;

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

      {platformErrors.length > 0 && (
        <div className="absolute left-1/2 top-20 z-50 max-w-lg -translate-x-1/2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p className="font-semibold">Could not fetch all comments from social platforms</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
            {platformErrors.map((pe, i) => (
              <li key={i}>
                <span className="capitalize">{pe.platform}</span>: {pe.error}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-200/90">
            Reconnect YouTube (and other accounts) under Social — token decryption failed or connection expired.
          </p>
        </div>
      )}

      <section className={styles.feedColumn}>
        <div className="border-b border-white/10 px-6 py-5 md:px-10">
          <h2 className="text-lg font-semibold">Social feed</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitoring {stats.publishedPosts || products.length} active campaign
            {(stats.publishedPosts || products.length) === 1 ? '' : 's'}
          </p>
        </div>
        <div className={`${styles.customScrollbar} flex-1 space-y-4 overflow-y-auto p-4`}>
          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand-instagram" />
            </div>
          ) : products.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-muted-foreground">
              <p>No products yet.</p>
              <Link href="/products" className="mt-2 inline-block text-[brand-facebook] hover:underline">
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
                className: 'text-brand-instagram',
                accent: 'text-brand-instagram',
                icon: 'generic' as const,
              };
              const active = selectedProduct?.id === product.id;
              const thumb = product.images?.[0]?.url;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => selectProduct(product)}
                  className={`${styles.glassCard} w-full cursor-pointer rounded-xl p-4 text-left transition-all hover:bg-muted ${
                    active ? styles.activeFeedItem : styles.feedItemDimmed
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
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
                          <span className={`${styles.labelCaps} text-muted-foreground`}>
                            {formatRelative(product.lastAnalyzedAt)}
                          </span>
                        )}
                      </div>
                      <h3 className="truncate text-sm font-bold">{product.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
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
          <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-muted-foreground">
            <MessageCircle className="h-12 w-12 opacity-30" />
            <p className="text-sm">Select a product from the feed to view engagement analytics.</p>
          </div>
        ) : loadingDetail ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-brand-instagram" />
            <span className="text-sm">Fetching all comments, sentiment &amp; replies…</span>
          </div>
        ) : (
          <div className="space-y-8 p-6 md:p-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-block rounded-full border border-[brand-facebook]/20 bg-[brand-facebook]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[brand-facebook]">
                  {stats.publishedPosts > 0 ? 'Active campaign' : 'Product'}
                </span>
                <h2 className="mt-2 text-2xl font-bold">{selectedProduct.title}</h2>
                {analysis?.summary && (
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{analysis.summary}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={liveSync}
                    onChange={(e) => setLiveSync(e.target.checked)}
                    className="accent-[brand-facebook]"
                  />
                  <span className={liveSync ? 'text-[brand-whatsapp]' : ''}>
                    {syncing ? 'Syncing…' : liveSync ? 'Live sync on' : 'Live sync off'}
                  </span>
                </label>
                {lastSyncedAt && (
                  <span className={`${styles.labelCaps} text-muted-foreground`}>
                    Synced {formatRelative(lastSyncedAt)}
                  </span>
                )}
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
                  onClick={() => selectedProduct && void runLiveSync(selectedProduct.id)}
                  disabled={syncing || !selectedProduct}
                  className={`${styles.btnGhost} flex items-center gap-2 rounded-lg px-4 py-2 disabled:opacity-50`}
                >
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  Sync now
                </button>
                <button
                  type="button"
                  onClick={runAiAnalysis}
                  disabled={analyzing || syncing || (rawComments.length === 0 && !analysis?.insights.length)}
                  className={`${styles.btnPrimary} flex items-center gap-2 rounded-lg px-4 py-2 disabled:opacity-50`}
                >
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {analyzing ? 'Analyzing…' : 'Full report'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className={`${styles.glassCard} ${styles.glowAccent} rounded-xl p-4 cursor-pointer hover:bg-muted transition`} onClick={() => setThreadRootId('engagement-graph')}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`${styles.labelCaps} text-muted-foreground`}>Engagement</span>
                  <TrendingUp className="h-4 w-4 text-brand-instagram" />
                </div>
                <div className={`${styles.metricValue} text-brand-instagram text-2xl`}>
                  {engagementRate != null ? `${engagementRate}%` : '—'}
                </div>
                <div className="mt-2 text-xs text-[brand-whatsapp]">
                  {analysis ? `+${analysis.purchaseLeads} leads` : 'Run analysis'}
                </div>
              </div>
              <div className={`${styles.glassCard} rounded-xl p-4 cursor-pointer hover:bg-muted transition`} onClick={() => setThreadRootId('comments-graph')}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`${styles.labelCaps} text-muted-foreground`}>Comments</span>
                  <Heart className="h-4 w-4 text-[brand-facebook]" />
                </div>
                <div className={`${styles.metricValue} text-[#e7e0ed] text-2xl`}>{stats.totalComments}</div>
                <div className="mt-2 text-xs text-muted-foreground">{stats.savedReplies} AI replies</div>
              </div>
              <div className={`${styles.glassCard} rounded-xl p-4 cursor-pointer hover:bg-muted transition`} onClick={() => setThreadRootId('sentiment-graph')}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`${styles.labelCaps} text-muted-foreground`}>Sentiment</span>
                  <Smile className="h-4 w-4 text-[brand-whatsapp]" />
                </div>
                <div className={`${styles.metricValue} text-[brand-whatsapp] text-2xl`}>
                  {sentimentScore != null ? `${sentimentScore}%` : '—'}
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-[brand-whatsapp]"
                    style={{ width: `${sentimentScore ?? 0}%` }}
                  />
                </div>
              </div>
              <div className={`${styles.glassCard} rounded-xl p-4 cursor-pointer hover:bg-muted transition`} onClick={() => setThreadRootId('posts-graph')}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`${styles.labelCaps} text-muted-foreground`}>Posts</span>
                  <Share2 className="h-4 w-4 text-brand-instagram" />
                </div>
                <div className={`${styles.metricValue} text-brand-instagram text-2xl`}>{stats.publishedPosts}</div>
                <div className="mt-2 text-xs text-muted-foreground">Active campaigns</div>
              </div>
            </div>

            {analysis?.productReception && (
              <ProductReceptionCard report={analysis.productReception} />
            )}

            {rawComments.length === 0 && !(analysis?.insights?.length ?? 0) ? (
              <div className={`${styles.glassCard} rounded-2xl p-10 text-center`}>
                <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No comments on published posts yet.</p>
                <Link
                  href="/posts"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[brand-facebook] hover:underline"
                >
                  Publish posts <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className={`${styles.glassCard} overflow-hidden rounded-xl`}>
                <div className="flex items-center justify-between border-b border-white/10 bg-muted/30 px-6 py-4">
                  <h3 className="font-bold text-sm">Comment Intelligence</h3>
                  <div className="flex items-center gap-2">
                    <span className={`${styles.labelCaps} text-muted-foreground`}>Sort:</span>
                    <select
                      value={commentSort}
                      onChange={(e) => setCommentSort(e.target.value as CommentSort)}
                      className="cursor-pointer border-none bg-transparent text-xs font-semibold uppercase tracking-wider text-[brand-facebook] outline-none"
                    >
                      <option value="impactful">Impactful</option>
                      <option value="recent">Recent</option>
                      <option value="negative">Negative</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-muted/50">
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Author</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comment</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Intent</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sentiment</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {intelligenceComments.map((comment) => (
                        <CommentIntelligenceRow
                          key={comment.commentId}
                          comment={comment}
                          actionLoadingId={actionLoadingId}
                          onAction={runCommentAction}
                          onViewThread={setThreadRootId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {threadReplyCount > 0 && (
                  <div className="border-t border-white/10 bg-muted/30 px-6 py-3 text-center">
                    <span className={`${styles.labelCaps} text-muted-foreground`}>
                      {threadReplyCount} thread {threadReplyCount === 1 ? 'reply' : 'replies'} nested under parent comments
                    </span>
                  </div>
                )}
              </div>
            )}

            {analysis && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className={`${styles.glassCard} rounded-xl p-4 cursor-pointer hover:bg-muted transition`} onClick={() => setThreadRootId('sentiment-graph')}>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Sentiment</h4>
                    <Smile className="h-4 w-4 text-[brand-whatsapp]" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Positive</span>
                      <span className="font-bold text-brand-whatsapp">{analysis.sentiment.positive}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${(analysis.sentiment.positive / Math.max(analysis.sentiment.positive + analysis.sentiment.neutral + analysis.sentiment.negative, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Neutral</span>
                      <span className="font-bold text-gray-400">{analysis.sentiment.neutral}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gray-500"
                        style={{ width: `${(analysis.sentiment.neutral / Math.max(analysis.sentiment.positive + analysis.sentiment.neutral + analysis.sentiment.negative, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Negative</span>
                      <span className="font-bold text-red-400">{analysis.sentiment.negative}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${(analysis.sentiment.negative / Math.max(analysis.sentiment.positive + analysis.sentiment.neutral + analysis.sentiment.negative, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className={`${styles.glassCard} rounded-xl p-4 cursor-pointer hover:bg-muted transition`} onClick={() => setThreadRootId('intent-graph')}>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Intent Distribution</h4>
                    <TrendingUp className="h-4 w-4 text-brand-instagram" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Purchase</span>
                      <span className="font-bold text-brand-whatsapp">{analysis.purchaseLeads}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Inquiry</span>
                      <span className="font-bold text-blue-400">{analysis.inquiries}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Auto Replied</span>
                      <span className="font-bold text-[brand-whatsapp]">{analysis.autoReplied}</span>
                    </div>
                  </div>
                </div>

                <div className={`${styles.glassCard} rounded-xl p-4 cursor-pointer hover:bg-muted transition`} onClick={() => setThreadRootId('velocity-graph')}>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Velocity</h4>
                    <Share2 className="h-4 w-4 text-[brand-facebook]" />
                  </div>
                  <div className="flex h-20 items-end gap-1">
                    {bars.slice(0, 12).map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm bg-brand-instagram/30 hover:bg-brand-instagram/60 transition"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Click to view full chart</p>
                </div>
              </div>
            )}

            {lastAnalyzedAt && (
              <p className={`${styles.labelCaps} text-center text-muted-foreground`}>
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
        onBuy={(c) => {
          const row = displayComments.find((d) => d.commentId === c.commentId);
          if (row) void runCommentAction(row, 'buy');
        }}
        onConnect={(c) => {
          const row = displayComments.find((d) => d.commentId === c.commentId);
          if (row) void runCommentAction(row, 'connect');
        }}
        actionLoadingId={actionLoadingId}
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
    className: 'text-brand-instagram',
    accent: 'text-brand-instagram',
    icon: 'generic' as const,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${style.className}`}>
      {style.label}
      {count != null && <span className="opacity-70"> ({count})</span>}
    </span>
  );
}

function CommentIntelligenceRow({
  comment,
  actionLoadingId,
  onAction,
  onViewThread,
}: {
  comment: ThreadedCommentRow;
  actionLoadingId: string | null;
  onAction: (comment: DisplayComment, action: 'buy' | 'connect' | 'reply') => void;
  onViewThread: (rootCommentId: string) => void;
}) {
  const intent = mapIntent(comment.intent || 'other');
  const showBuy = intent === 'purchase' || intent === 'inquiry';
  const isActionLoading = actionLoadingId === comment.commentId;
  const status = comment.replyStatus;
  const isReply = comment.depth > 0;
  const threadRootId = comment.threadRootId;

  return (
    <tr
      className={`transition ${isReply ? 'bg-muted/40 hover:bg-muted/60' : 'hover:bg-white/5'}`}
    >
      <td className="py-4 whitespace-nowrap" style={{ paddingLeft: 16 + comment.depth * 20, paddingRight: 24 }}>
        <div className="flex items-center gap-2">
          {isReply && (
            <GitBranch className="h-3.5 w-3.5 shrink-0 text-[brand-facebook]/70" aria-hidden />
          )}
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              isReply ? 'bg-[brand-facebook]/25 text-[brand-facebook]' : 'bg-[#03b5d3] text-[#00424e]'
            }`}
          >
            {initials(comment.author || 'U')}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{comment.author}</div>
            {isReply && comment.replyToAuthor && (
              <div className="text-[9px] text-muted-foreground truncate">Reply to @{comment.replyToAuthor.replace(/^@/, '')}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="max-w-md">
          <p className={`text-xs text-muted-foreground ${isReply ? 'line-clamp-3' : 'line-clamp-2'}`}>{comment.text}</p>
          <span className={`${styles.labelCaps} text-muted-foreground text-[9px]`}>
            {comment.platform}
            {isReply ? ' · thread' : ''}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <IntentBadge intent={intent} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {comment.sentiment && <SentimentBadge sentiment={comment.sentiment} />}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <PriorityBadge priority={comment.priority || 'low'} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {status?.sent ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Replied
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Pending</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {showBuy && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => void onAction(comment, 'buy')}
              className="rounded bg-emerald-500/20 px-2 py-1 text-[9px] font-bold uppercase text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              Buy
            </button>
          )}
          <button
            type="button"
            disabled={!!status?.sent || isActionLoading}
            onClick={() => void onAction(comment, 'reply')}
            className="rounded bg-brand-instagram/20 px-2 py-1 text-[9px] font-bold uppercase text-brand-instagram hover:bg-brand-instagram/30 disabled:opacity-50"
          >
            {status?.sent ? 'Sent' : 'Reply'}
          </button>
          <button
            type="button"
            onClick={() => onViewThread(threadRootId)}
            className="rounded bg-[brand-facebook]/20 px-2 py-1 text-[9px] font-bold uppercase text-[brand-facebook] hover:bg-[brand-facebook]/30"
          >
            View
          </button>
        </div>
      </td>
    </tr>
  );
}

function ReplyStatusBanner({ status }: { status: ReplyStatus }) {
  if (status.sent && status.skipped) {
    const label = PLATFORM_STYLES[status.platform.toLowerCase()]?.label || status.platform;
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-whatsapp/80" />
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
    good: 'border-emerald-500/50 bg-brand-whatsapp/15 text-emerald-300',
    mixed: 'border-amber-500/50 bg-brand-google-yellow/15 text-amber-200',
    needs_attention: 'border-red-500/50 bg-red-500/15 text-red-300',
  };
  const verdictLabel: Record<string, string> = {
    good: 'Good fit for customers',
    mixed: 'Mixed reception',
    needs_attention: 'Needs attention',
  };
  return (
    <div className={`${styles.glassCard} rounded-2xl border border-brand-instagram/30 bg-gradient-to-br from-brand-instagram/10 to-transparent p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-instagram/15">
            <TrendingUp className="h-5 w-5 text-brand-instagram" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Product reception report</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Based on customer feedback</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-brand-instagram">{report.score}</p>
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
      {(report.strengths ?? []).length > 0 && (
        <ul className="mt-4 space-y-2">
          <li className="flex items-center gap-2 text-xs font-semibold text-brand-whatsapp">
            <ThumbsUp className="h-4 w-4" /> Strengths
          </li>
          {(report.strengths ?? []).map((s, i) => (
            <li key={i} className="ml-6 text-sm text-muted-foreground">
              • {s}
            </li>
          ))}
        </ul>
      )}
      {(report.concerns ?? []).length > 0 && (
        <ul className="mt-4 space-y-2">
          <li className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <ThumbsDown className="h-4 w-4" /> Concerns
          </li>
          {(report.concerns ?? []).map((c, i) => (
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
    <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" />}>
      <ProductAnalysisContent />
    </Suspense>
  );
}
