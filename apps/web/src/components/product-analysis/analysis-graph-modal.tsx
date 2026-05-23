'use client';

import { X, TrendingUp, Smile, Share2, Heart } from 'lucide-react';
import { ProductReceptionReport } from '@/lib/api';

interface AnalysisGraphModalProps {
  open: boolean;
  onClose: () => void;
  graphType: string | null;
  sentiment?: { positive: number; neutral: number; negative: number };
  purchaseLeads?: number;
  inquiries?: number;
  autoReplied?: number;
  totalComments?: number;
  bars?: number[];
  productReception?: ProductReceptionReport;
  engagementRate?: number | null;
}

export function AnalysisGraphModal({
  open,
  onClose,
  graphType,
  sentiment,
  purchaseLeads = 0,
  inquiries = 0,
  autoReplied = 0,
  totalComments = 0,
  bars = [],
  productReception,
  engagementRate,
}: AnalysisGraphModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 hover:bg-white/10 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {graphType === 'sentiment-graph' && sentiment && (
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-[brand-whatsapp]/20 p-2">
                <Smile className="h-5 w-5 text-[brand-whatsapp]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Sentiment Analysis</h2>
                <p className="text-sm text-muted-foreground">Distribution of customer sentiment</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                <div className="text-3xl font-bold text-brand-whatsapp">{sentiment.positive}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mt-1">Positive</div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${(sentiment.positive / Math.max(sentiment.positive + sentiment.neutral + sentiment.negative, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="rounded-xl bg-gray-500/10 border border-gray-500/30 p-4">
                <div className="text-3xl font-bold text-gray-400">{sentiment.neutral}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-300 mt-1">Neutral</div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gray-500"
                    style={{
                      width: `${(sentiment.neutral / Math.max(sentiment.positive + sentiment.neutral + sentiment.negative, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
                <div className="text-3xl font-bold text-red-400">{sentiment.negative}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-red-300 mt-1">Negative</div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-red-500"
                    style={{
                      width: `${(sentiment.negative / Math.max(sentiment.positive + sentiment.neutral + sentiment.negative, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-muted/50 p-6">
              <h3 className="text-sm font-semibold mb-4">Sentiment Velocity Chart</h3>
              <div className="flex h-48 items-end gap-1">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-brand-instagram to-brand-instagram/50 hover:from-brand-instagram hover:to-brand-instagram transition"
                    style={{ height: `${h}%` }}
                    title={`${h}%`}
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                <span>Time →</span>
                <span>Sentiment Intensity</span>
              </div>
            </div>
          </div>
        )}

        {graphType === 'engagement-graph' && (
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-brand-instagram/20 p-2">
                <TrendingUp className="h-5 w-5 text-brand-instagram" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Engagement Metrics</h2>
                <p className="text-sm text-muted-foreground">Customer engagement overview</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-brand-instagram/10 border border-brand-instagram/30 p-6">
                <div className="text-4xl font-bold text-brand-instagram">{engagementRate != null ? `${engagementRate}%` : '—'}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-instagram/70 mt-2">Engagement Rate</div>
                <p className="text-xs text-muted-foreground mt-3">Percentage of comments with purchase intent or inquiry</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-6">
                <div className="text-4xl font-bold text-brand-whatsapp">{purchaseLeads}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mt-2">Purchase Leads</div>
                <p className="text-xs text-muted-foreground mt-3">Comments indicating purchase intent</p>
              </div>
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-6">
                <div className="text-4xl font-bold text-blue-400">{inquiries}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-300 mt-2">Inquiries</div>
                <p className="text-xs text-muted-foreground mt-3">Questions and information requests</p>
              </div>
              <div className="rounded-xl bg-[brand-whatsapp]/10 border border-[brand-whatsapp]/30 p-6">
                <div className="text-4xl font-bold text-[brand-whatsapp]">{autoReplied}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[brand-whatsapp]/70 mt-2">Auto Replied</div>
                <p className="text-xs text-muted-foreground mt-3">Comments with AI-generated replies</p>
              </div>
            </div>
          </div>
        )}

        {graphType === 'comments-graph' && (
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-[brand-facebook]/20 p-2">
                <Heart className="h-5 w-5 text-[brand-facebook]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Comment Statistics</h2>
                <p className="text-sm text-muted-foreground">Total comments and engagement</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-[brand-facebook]/10 border border-[brand-facebook]/30 p-6">
                <div className="text-4xl font-bold text-[brand-facebook]">{totalComments}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[brand-facebook]/70 mt-2">Total Comments</div>
              </div>
              <div className="rounded-xl bg-[brand-whatsapp]/10 border border-[brand-whatsapp]/30 p-6">
                <div className="text-4xl font-bold text-[brand-whatsapp]">{autoReplied}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[brand-whatsapp]/70 mt-2">AI Replies</div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-muted/50 p-6">
              <h3 className="text-sm font-semibold mb-4">Reply Rate</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-gradient-to-r from-[brand-facebook] to-[brand-whatsapp]"
                      style={{ width: `${totalComments > 0 ? (autoReplied / totalComments) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-bold text-[brand-facebook]">
                  {totalComments > 0 ? Math.round((autoReplied / totalComments) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        )}

        {graphType === 'velocity-graph' && (
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-[brand-facebook]/20 p-2">
                <Share2 className="h-5 w-5 text-[brand-facebook]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Sentiment Velocity</h2>
                <p className="text-sm text-muted-foreground">Real-time sentiment intensity over time</p>
              </div>
            </div>

            <div className="rounded-xl bg-muted/50 p-6">
              <div className="flex h-64 items-end gap-1">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-brand-instagram to-brand-instagram/50 hover:from-brand-instagram hover:to-brand-instagram transition group relative"
                    style={{ height: `${h}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-muted px-2 py-1 text-xs font-semibold text-brand-instagram opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      {h}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between text-xs text-muted-foreground">
                <span>← Earlier</span>
                <span>Later →</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                <div className="text-sm font-semibold text-emerald-300">Peak</div>
                <div className="text-2xl font-bold text-brand-whatsapp mt-1">{Math.max(...bars)}%</div>
              </div>
              <div className="rounded-lg bg-gray-500/10 p-3 text-center">
                <div className="text-sm font-semibold text-gray-300">Average</div>
                <div className="text-2xl font-bold text-gray-400 mt-1">
                  {bars.length > 0 ? Math.round(bars.reduce((a, b) => a + b, 0) / bars.length) : 0}%
                </div>
              </div>
              <div className="rounded-lg bg-red-500/10 p-3 text-center">
                <div className="text-sm font-semibold text-red-300">Low</div>
                <div className="text-2xl font-bold text-red-400 mt-1">{Math.min(...bars)}%</div>
              </div>
            </div>
          </div>
        )}

        {graphType === 'posts-graph' && (
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-brand-instagram/20 p-2">
                <Share2 className="h-5 w-5 text-brand-instagram" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Campaign Overview</h2>
                <p className="text-sm text-muted-foreground">Active posts and campaigns</p>
              </div>
            </div>

            <div className="rounded-xl bg-muted/50 p-6">
              <p className="text-sm text-muted-foreground">Campaign metrics and performance data will be displayed here.</p>
            </div>
          </div>
        )}

        {graphType === 'intent-graph' && (
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-brand-instagram/20 p-2">
                <TrendingUp className="h-5 w-5 text-brand-instagram" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Intent Distribution</h2>
                <p className="text-sm text-muted-foreground">Breakdown of customer intents</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-6">
                <div className="text-3xl font-bold text-brand-whatsapp">{purchaseLeads}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mt-2">Purchase</div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${purchaseLeads + inquiries + autoReplied > 0 ? (purchaseLeads / (purchaseLeads + inquiries + autoReplied)) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-6">
                <div className="text-3xl font-bold text-blue-400">{inquiries}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-300 mt-2">Inquiry</div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${purchaseLeads + inquiries + autoReplied > 0 ? (inquiries / (purchaseLeads + inquiries + autoReplied)) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="rounded-xl bg-[brand-whatsapp]/10 border border-[brand-whatsapp]/30 p-6">
                <div className="text-3xl font-bold text-[brand-whatsapp]">{autoReplied}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[brand-whatsapp]/70 mt-2">Replied</div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-[brand-whatsapp]"
                    style={{
                      width: `${purchaseLeads + inquiries + autoReplied > 0 ? (autoReplied / (purchaseLeads + inquiries + autoReplied)) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-white/10 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
