'use client';


import { X, Bot, Sparkles } from 'lucide-react';
import styles from '@/app/(dashboard)/product-analysis/product-analysis.module.css';

export interface ThreadComment {
  commentId: string;
  author: string;
  text: string;
  platform?: string;
  isReply?: boolean;
  parentCommentId?: string;
  parentAuthor?: string;
  sentiment?: string;
  intent?: string;
  suggestedReply?: string;
  replyStatus?: { sent?: boolean; replyText?: string } | null;
}

interface CommentThreadModalProps {
  open: boolean;
  onClose: () => void;
  productTitle: string;
  campaignCaption?: string;
  comments: ThreadComment[];
  rootCommentId: string | null;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function sentimentTag(sentiment?: string, intent?: string) {
  if (sentiment === 'negative' || intent === 'complaint') {
    return { label: 'Needs attention', className: 'border-amber-500/20 bg-amber-500/10 text-amber-200' };
  }
  if (intent === 'purchase' || intent === 'question') {
    return { label: 'Inquiry', className: 'border-[#4cd7f6]/20 bg-[#4cd7f6]/10 text-[#4cd7f6]' };
  }
  return { label: 'Positive', className: 'border-[#4fdbc8]/20 bg-[#4fdbc8]/10 text-[#4fdbc8]' };
}

function AiReplyBlock({
  reply,
  variant,
}: {
  reply: string;
  variant: 'primary' | 'secondary' | 'tertiary';
}) {
  const panelClass =
    variant === 'primary'
      ? styles.aiReplyPanelPrimary
      : variant === 'secondary'
        ? styles.aiReplyPanelSecondary
        : styles.aiReplyPanelTertiary;
  const accent =
    variant === 'primary' ? 'text-[#d0bcff]' : variant === 'secondary' ? 'text-[#4cd7f6]' : 'text-[#4fdbc8]';

  return (
    <div className={`${styles.aiReplyPanel} ${panelClass} p-4`}>
      <div className={`mb-2 flex items-center gap-2 ${accent}`}>
        <Bot className="h-3.5 w-3.5" />
        <span className={styles.labelCaps}>AI suggested reply</span>
      </div>
      <p className="font-mono text-xs italic leading-relaxed text-[#cbc3d7]">&ldquo;{reply}&rdquo;</p>
    </div>
  );
}

export function CommentThreadModal({
  open,
  onClose,
  productTitle,
  campaignCaption,
  comments,
  rootCommentId,
}: CommentThreadModalProps) {
  if (!open || !rootCommentId) return null;

  const root = comments.find((c) => c.commentId === rootCommentId);
  const replies = comments.filter((c) => c.parentCommentId === rootCommentId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      <div className="absolute inset-0 bg-[#15121b]/80 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div
        className={`${styles.glassCard} relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-[#d0bcff]/20 shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[#211e27]/50 px-6 py-4">
          <h3 className="text-lg font-bold">Conversation thread</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`${styles.customScrollbar} flex-1 space-y-8 overflow-y-auto p-6`}>
          <div className="rounded-xl border border-[#d0bcff]/20 bg-[#d0bcff]/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#d0bcff]">
              <Sparkles className="h-3.5 w-3.5" />
              {productTitle}
            </div>
            <p className="text-sm italic text-[#e7e0ed]/90">
              {campaignCaption || 'Published campaign for this product.'}
            </p>
          </div>

          {root && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#03b5d3] text-sm font-bold text-[#00424e]">
                  {initials(root.author)}
                </div>
                <div>
                  <div className="font-bold">{root.author}</div>
                  <div className={`${styles.labelCaps} text-[#958ea0]`}>Top-level comment</div>
                </div>
                <span
                  className={`ml-auto rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${sentimentTag(root.sentiment, root.intent).className}`}
                >
                  {sentimentTag(root.sentiment, root.intent).label}
                </span>
              </div>
              <p className="pl-[52px] text-sm leading-relaxed">{root.text}</p>
              {(root.suggestedReply || root.replyStatus?.replyText) && (
                <div className="pl-[52px]">
                  <AiReplyBlock
                    reply={root.replyStatus?.replyText || root.suggestedReply || ''}
                    variant="primary"
                  />
                </div>
              )}

              {replies.length > 0 && (
                <div className="ml-12 space-y-6 border-l-2 border-white/10 pl-6">
                  {replies.map((r) => (
                    <div key={r.commentId} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#37333d] text-xs font-bold">
                          {initials(r.author)}
                        </div>
                        <div>
                          <div className="text-sm font-bold">{r.author}</div>
                          <div className={`${styles.labelCaps} text-[#958ea0]`}>Thread reply</div>
                        </div>
                      </div>
                      <p className="text-sm text-[#cbc3d7]">{r.text}</p>
                      {(r.suggestedReply || r.replyStatus?.replyText) && (
                        <AiReplyBlock
                          reply={r.replyStatus?.replyText || r.suggestedReply || ''}
                          variant="secondary"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
