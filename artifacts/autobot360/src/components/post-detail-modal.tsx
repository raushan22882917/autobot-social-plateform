
import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  MessageCircle,
  Sparkles,
  Send,
  ShoppingCart,
  ThumbsUp,
  Eye,
  Copy,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/data';
import { PublishLinks } from '@/components/publish-links';
import { YouTubePrivacySelector, type YouTubePrivacy } from '@/components/youtube-privacy-selector';
import { apiClient, ScheduledPost, ApiError } from '@/lib/api';

interface EngagementPlatform {
  platform: string;
  platformPostId: string;
  platformPostUrl?: string;
  metrics: { likes?: number; comments?: number; views?: number; shares?: number; reach?: number };
  comments: Array<{
    id: string;
    text: string;
    author: string;
    timestamp?: string;
    likeCount?: number;
    platform: string;
  }>;
  error?: string;
}

interface CommentInsight {
  commentId: string;
  intent: string;
  shouldReply: boolean;
  priority: string;
  suggestedReply: string;
  reason: string;
}

export function PostDetailModal({
  post,
  token,
  open,
  onClose,
  onUpdated,
}: {
  post: ScheduledPost | null;
  token: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [tab, setTab] = useState<'overview' | 'comments' | 'sales'>('overview');
  const [loading, setLoading] = useState(false);
  const [engagement, setEngagement] = useState<{
    platforms: EngagementPlatform[];
    totals: { likes: number; comments: number; views: number };
  } | null>(null);
  const [insights, setInsights] = useState<CommentInsight[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState('');
  const [purchaseLeads, setPurchaseLeads] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [customerMsg, setCustomerMsg] = useState('');
  const [purchaseAssist, setPurchaseAssist] = useState<{
    summary: string;
    steps: string[];
    suggestedReply: string;
    dmScript: string;
    checkoutUrl: string;
  } | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScheduledPost | null>(post);
  const [error, setError] = useState<string | null>(null);

  const loadEngagement = useCallback(async () => {
    if (!token || !post) return;
    setLoading(true);
    setError(null);
    try {
      const [eng, detailRes] = await Promise.all([
        apiClient.getPostEngagement(token, post.id),
        apiClient.getScheduledPost(token, post.id),
      ]);
      setEngagement(eng);
      setDetail(detailRes.post);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load engagement');
    } finally {
      setLoading(false);
    }
  }, [token, post]);

  useEffect(() => {
    if (open && post) {
      setDetail(post);
      setTab('overview');
      setInsights([]);
      setPurchaseAssist(null);
      setCustomerMsg('');
      void loadEngagement();
    }
  }, [open, post, loadEngagement]);

  async function runAiAnalysis() {
    if (!token || !post) return;
    setAnalyzing(true);
    try {
      const res = await apiClient.analyzePostComments(token, post.id);
      setInsights(res.analysis.insights || []);
      setAnalysisSummary(res.analysis.summary || '');
      setPurchaseLeads(res.analysis.purchaseLeads || 0);
      setTab('comments');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  async function runPurchaseAssist(createCheckout = false) {
    if (!token || !post) return;
    setAssistLoading(true);
    try {
      const res = await apiClient.purchaseAssist(token, post.id, {
        customerMessage: customerMsg || 'I want to buy this product',
        createCheckout,
      });
      setPurchaseAssist({
        ...res.assist,
        checkoutUrl: res.checkoutUrl,
      });
      setTab('sales');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Purchase assist failed');
    } finally {
      setAssistLoading(false);
    }
  }

  async function sendReply(commentId: string, platform: string, message: string) {
    if (!token || !post) return;
    setReplyingId(commentId);
    try {
      await apiClient.replyToComment(token, post.id, { commentId, platform, message });
      await loadEngagement();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Reply failed');
    } finally {
      setReplyingId(null);
    }
  }

  function insightFor(commentId: string) {
    return insights.find((i) => i.commentId === commentId);
  }

  const allComments = engagement?.platforms.flatMap((p) => p.comments) || [];

  if (!post) return null;

  return (
    <Modal open={open} onClose={onClose} title={detail?.productTitle || post.productTitle || 'Post details'} size="xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={detail?.status || post.status} />
          <span className="text-xs text-muted-foreground capitalize">{(detail?.platforms || post.platforms).join(' · ')}</span>
          <PublishLinks results={detail?.publishResults || post.publishResults} />
        </div>

        {error && (
          <p className="text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 border-b border-white/10 pb-2">
          {(['overview', 'comments', 'sales'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
                tab === t ? 'bg-violet-500/30 text-violet-200' : 'text-muted-foreground hover:bg-white/5'
              }`}
            >
              {t}
              {t === 'comments' && allComments.length > 0 && (
                <span className="ml-1 text-xs opacity-70">({allComments.length})</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading live stats…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard icon={ThumbsUp} label="Likes" value={engagement?.totals.likes ?? '—'} />
                  <MetricCard icon={MessageCircle} label="Comments" value={engagement?.totals.comments ?? '—'} />
                  <MetricCard icon={Eye} label="Views" value={engagement?.totals.views ?? '—'} />
                </div>
                {engagement?.platforms.map((p) => (
                  <div key={p.platform} className="rounded-xl border border-white/10 p-3 text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{p.platform}</span>
                      {p.platformPostUrl && (
                        <a
                          href={p.platformPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-violet-300 flex items-center gap-1"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {p.error ? (
                      <p className="text-xs text-amber-400">{p.error}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {p.metrics.likes != null && `${p.metrics.likes} likes · `}
                        {p.metrics.comments != null && `${p.metrics.comments} comments · `}
                        {p.metrics.views != null && `${p.metrics.views} views`}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void runAiAnalysis()} loading={analyzing}>
                <Sparkles className="h-4 w-4" /> AI: Analyze comments
              </Button>
              <Button variant="secondary" onClick={() => void loadEngagement()}>
                <BarChart3 className="h-4 w-4" /> Refresh stats
              </Button>
            </div>
            {detail?.platforms?.includes('youtube') && token && (
              <YouTubePrivacySelector
                value={(detail.youtubePrivacy || 'unlisted') as YouTubePrivacy}
                onChange={async (privacy) => {
                  await apiClient.updateYouTubePrivacy(token, post.id, privacy);
                  onUpdated?.();
                }}
              />
            )}
          </div>
        )}

        {tab === 'comments' && (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {!allComments.length && !loading && (
              <p className="text-sm text-muted-foreground py-6 text-center">No comments yet on connected platforms.</p>
            )}
            {purchaseLeads > 0 && (
              <p className="text-xs text-emerald-400 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                {purchaseLeads} comment{purchaseLeads > 1 ? 's' : ''} show purchase intent — check Sales tab.
              </p>
            )}
            {analysisSummary && <p className="text-sm text-violet-200">{analysisSummary}</p>}
            {allComments.map((c) => {
              const ins = insightFor(c.id);
              return (
                <div key={c.id} className="rounded-xl border border-white/10 p-3 space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-medium text-violet-200">
                      @{c.author} · <span className="capitalize text-muted-foreground">{c.platform}</span>
                    </span>
                    {ins && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          ins.shouldReply ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-muted-foreground'
                        }`}
                      >
                        {ins.shouldReply ? 'Reply' : 'Skip'} · {ins.intent}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{c.text}</p>
                  {ins && (
                    <>
                      <p className="text-xs text-muted-foreground">{ins.reason}</p>
                      <div className="rounded-lg bg-white/5 p-2 text-xs text-violet-100">{ins.suggestedReply}</div>
                      <div className="flex flex-wrap gap-2">
                        {ins.intent === 'purchase' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setCustomerMsg(c.text);
                              void runPurchaseAssist(true);
                            }}
                          >
                            <ShoppingCart className="h-3 w-3" /> Sales flow
                          </Button>
                        )}
                        {ins.shouldReply && (c.platform === 'instagram' || c.platform === 'facebook') && (
                          <Button
                            size="sm"
                            loading={replyingId === c.id}
                            onClick={() => void sendReply(c.id, c.platform, ins.suggestedReply)}
                          >
                            <Send className="h-3 w-3" /> Post reply
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigator.clipboard.writeText(ins.suggestedReply)}
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            <Button className="w-full" variant="secondary" onClick={() => void runAiAnalysis()} loading={analyzing}>
              <Sparkles className="h-4 w-4" /> {insights.length ? 'Re-analyze' : 'Analyze'} with AI
            </Button>
          </div>
        )}

        {tab === 'sales' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              AI guides you from comment/DM to checkout — create a payment link and send the suggested reply.
            </p>
            <textarea
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm min-h-[80px]"
              placeholder="Paste customer message (e.g. price? how to order?)"
              value={customerMsg}
              onChange={(e) => setCustomerMsg(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void runPurchaseAssist(true)} loading={assistLoading}>
                <ShoppingCart className="h-4 w-4" /> Create checkout &amp; get script
              </Button>
              <Button variant="secondary" onClick={() => void runPurchaseAssist(false)} loading={assistLoading}>
                AI script only
              </Button>
            </div>
            {purchaseAssist && (
              <div className="space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm">
                <p className="font-medium text-violet-200">{purchaseAssist.summary}</p>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  {purchaseAssist.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Public reply</p>
                  <p className="rounded-lg bg-white/5 p-2">{purchaseAssist.suggestedReply}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">DM script</p>
                  <p className="rounded-lg bg-white/5 p-2">{purchaseAssist.dmScript}</p>
                </div>
                <a
                  href={purchaseAssist.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-violet-300 text-sm hover:underline"
                >
                  Open checkout link <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <Icon className="h-4 w-4 mx-auto text-violet-400 mb-1" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
