'use client';

import { cn } from '@/lib/utils';

const PRESETS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  confirmed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  shipped: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  archived: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  disconnected: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        PRESETS[key] || 'bg-white/10 text-muted-foreground border-white/10',
        className
      )}
    >
      {status}
    </span>
  );
}
