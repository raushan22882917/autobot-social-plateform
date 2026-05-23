'use client';


import { motion } from 'framer-motion';
import { Heart, MessageCircle, Send, Play } from 'lucide-react';

export type PreviewPlatform =
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'
  | 'whatsapp'
  | 'pinterest'
  | 'google';

const STATS: Record<PreviewPlatform, string> = {
  instagram: '12,482 likes',
  facebook: '840 reactions · 12 comments',
  youtube: '1.2K views · 2 hours ago',
  tiktok: '45.2K likes',
  whatsapp: 'Status seen by 42',
  pinterest: 'Saved 45 times',
  google: 'Listed in local search',
};

export type PreviewContentFormat = 'post' | 'reel' | 'story';

export function StudioPhonePreview({
  platform,
  contentFormat = 'post',
  caption,
  headline,
  hashtags,
  mediaUrl,
  mediaType,
  accountName = 'AutoBot_Official',
}: {
  platform: PreviewPlatform;
  contentFormat?: PreviewContentFormat;
  caption: string;
  headline?: string;
  hashtags?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  accountName?: string;
}) {
  const isStory = contentFormat === 'story';
  const isReel = contentFormat === 'reel';
  const isVertical = isStory || isReel;
  const showHeader = !isVertical && !['tiktok', 'pinterest'].includes(platform);
  const showActions = !isVertical && platform !== 'whatsapp';
  const showYtPlay = platform === 'youtube' && !isVertical;
  const captionText = caption.trim() || 'Your caption will appear here in real-time…';

  return (
    <motion.div className="group relative z-10 flex flex-col items-center">
      <div className="relative mt-12 h-[600px] w-[320px] overflow-hidden rounded-[48px] border-[8px] border-[#37333d] bg-black shadow-2xl">
        <div className="relative flex h-full w-full flex-col">
          <div className="absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-[#37333d]" />

          {isStory && (
            <div className="absolute left-0 right-0 top-8 z-20 flex gap-1 px-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-0.5 flex-1 overflow-hidden rounded-full bg-white/30 ${i === 0 ? '' : 'opacity-40'}`}
                >
                  <div className={`h-full bg-white ${i === 0 ? 'w-1/3' : 'w-0'}`} />
                </div>
              ))}
            </div>
          )}

          {showHeader && (
            <div className="z-10 flex items-center gap-3 p-4 pt-8">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand-instagram to-[brand-facebook] p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-black bg-[#37333d] text-[10px] font-bold text-white">
                  AB
                </div>
              </div>
              <span className="text-xs font-bold text-white">{accountName}</span>
            </div>
          )}

          <div
            className={`relative flex flex-1 items-center justify-center overflow-hidden bg-[#37333d] ${
              isVertical ? 'min-h-0' : ''
            }`}
          >
            {mediaUrl ? (
              mediaType === 'video' ? (
                <video src={mediaUrl} className="h-full w-full object-cover" muted playsInline />
              ) : (
                <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Add media</div>
            )}
            {showYtPlay && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="h-16 w-16 text-foreground" fill="white" />
              </div>
            )}
            {isReel && (
              <>
                <div className="absolute bottom-24 right-3 z-10 flex flex-col gap-4 text-white">
                  <Heart className="h-6 w-6" />
                  <MessageCircle className="h-6 w-6" />
                  <Send className="h-6 w-6" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/85 to-transparent p-4 pb-6 pr-14 pt-12">
                  <p className="text-[11px] font-bold text-white">{accountName}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-foreground">{captionText}</p>
                </div>
              </>
            )}
            {isStory && captionText && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-8 pt-16">
                <p className="text-[11px] font-bold text-white">{accountName}</p>
                <p className="mt-1 line-clamp-3 text-[11px] text-foreground">{captionText}</p>
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
                {hashtags && <p className="text-[10px] text-[brand-facebook]">{hashtags}</p>}
              </div>
              <p className="text-[10px] uppercase tracking-tighter text-muted-foreground">Just now</p>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-4 py-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-[10px] font-medium text-foreground">LIVE PREVIEW</span>
        </div>
      </div>

      <p className="mt-6 max-w-sm text-center text-sm text-muted-foreground">
        Live preview · {contentFormat === 'post' ? 'Post' : contentFormat === 'reel' ? 'Reels' : 'Story'}
      </p>
    </motion.div>
  );
}
