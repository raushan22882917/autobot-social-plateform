'use client';


import { motion } from 'framer-motion';
import { Heart, MessageCircle, Send, Play } from 'lucide-react';

export type PreviewPlatform =
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'
  | 'whatsapp'
  | 'linkedin'
  | 'pinterest'
  | 'telegram'
  | 'google';

const STATS: Record<PreviewPlatform, string> = {
  instagram: '12,482 likes',
  facebook: '840 reactions · 12 comments',
  youtube: '1.2K views · 2 hours ago',
  tiktok: '45.2K likes',
  whatsapp: 'Status seen by 42',
  linkedin: '840 impressions · 12 comments',
  pinterest: 'Saved 45 times',
  telegram: '1.1K subscribers reached',
  google: 'Listed in local search',
};

export function StudioPhonePreview({
  platform,
  caption,
  headline,
  hashtags,
  mediaUrl,
  mediaType,
  accountName = 'AutoBot_Official',
}: {
  platform: PreviewPlatform;
  caption: string;
  headline?: string;
  hashtags?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  accountName?: string;
}) {
  const showHeader = !['tiktok', 'pinterest', 'telegram'].includes(platform);
  const showActions = platform !== 'whatsapp';
  const showYtPlay = platform === 'youtube';
  const captionText = caption.trim() || 'Your caption will appear here in real-time…';

  return (
    <motion.div className="group relative z-10 flex flex-col items-center">
      <div className="relative mt-12 h-[600px] w-[320px] overflow-hidden rounded-[48px] border-[8px] border-[#37333d] bg-black shadow-2xl">
        <div className="relative flex h-full w-full flex-col">
          <div className="absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-[#37333d]" />

          {showHeader && (
            <div className="z-10 flex items-center gap-3 p-4 pt-8">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#d0bcff] to-[#4cd7f6] p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-black bg-[#37333d] text-[10px] font-bold text-white">
                  AB
                </div>
              </div>
              <span className="text-xs font-bold text-white">{accountName}</span>
            </div>
          )}

          <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#37333d]">
            {mediaUrl ? (
              mediaType === 'video' ? (
                <video src={mediaUrl} className="h-full w-full object-cover" muted playsInline />
              ) : (
                <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-white/40">Add media</div>
            )}
            {showYtPlay && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="h-16 w-16 text-white/80" fill="white" />
              </div>
            )}
          </div>

          {showHeader && (
            <div className="space-y-3 bg-black/80 p-4 backdrop-blur-md">
              {showActions && (
                <div className="flex gap-4 text-white">
                  <Heart className="h-5 w-5" />
                  <MessageCircle className="h-5 w-5" />
                  <Send className="h-5 w-5" />
                </div>
              )}
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-white">{STATS[platform]}</p>
                {headline && <p className="text-[11px] font-bold text-white">{headline}</p>}
                <p className="text-[11px] leading-tight text-white">
                  <span className="font-bold">{accountName}</span> {captionText}
                </p>
                {hashtags && <p className="text-[10px] text-[#4cd7f6]">{hashtags}</p>}
              </div>
              <p className="text-[10px] uppercase tracking-tighter text-white/50">Just now</p>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-4 py-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-[10px] font-medium text-white/80">LIVE PREVIEW</span>
        </div>
      </div>

      <p className="mt-6 max-w-sm text-center text-sm text-[#cbc3d7]">Live preview</p>
    </motion.div>
  );
}
