'use client';

import { motion } from 'framer-motion';

export type YouTubePrivacy = 'private' | 'unlisted' | 'public';

const OPTIONS: { value: YouTubePrivacy; label: string; hint: string }[] = [
  { value: 'private', label: 'Private', hint: 'Only you and people you choose' },
  { value: 'unlisted', label: 'Unlisted', hint: 'Anyone with the link' },
  { value: 'public', label: 'Public', hint: 'Everyone can watch' },
];

export function YouTubePrivacySelector({
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  value: YouTubePrivacy;
  onChange: (v: YouTubePrivacy) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <motion.div layout className={compact ? 'space-y-2' : 'space-y-3'}>
      <p className="text-xs font-medium text-violet-200">YouTube visibility</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
              value === opt.value
                ? 'border-violet-400/60 bg-violet-500/25 text-violet-100'
                : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${compact ? 'flex-1 min-w-[88px] px-2 py-1.5' : 'min-w-[100px]'}`}
          >
            <span className={`block font-medium capitalize ${compact ? 'text-xs' : 'text-sm'}`}>
              {opt.label}
            </span>
            {!compact && <span className="mt-0.5 block text-[10px] opacity-80">{opt.hint}</span>}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
