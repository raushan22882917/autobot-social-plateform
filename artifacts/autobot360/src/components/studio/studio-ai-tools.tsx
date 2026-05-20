
import { useState } from 'react';
import { Box, ImagePlus, Sparkles, Clapperboard, Wand2, Loader2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';

type MediaItem = { type: 'image' | 'video' | 'model'; url: string; name: string };

interface StudioAiToolsProps {
  token: string | null;
  aspectRatio: '1:1' | '9:16' | '16:9';
  features: {
    imageGenerate?: boolean;
    imageEnhance?: boolean;
    videoGenerate?: boolean;
    imageTo3d?: boolean;
  };
  selectedImageUrl?: string;
  onMediaAdded: (item: MediaItem) => void;
  onMessage: (msg: { type: 'ok' | 'err'; text: string } | null) => void;
  disabled?: boolean;
}

export function StudioAiTools({
  token,
  aspectRatio,
  features,
  selectedImageUrl,
  onMediaAdded,
  onMessage,
  disabled,
}: StudioAiToolsProps) {
  const [imagePrompt, setImagePrompt] = useState('');
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function run<T>(key: string, fn: () => Promise<T>, ok: (r: T) => void) {
    if (!token) return;
    setBusy(key);
    onMessage(null);
    try {
      const result = await fn();
      ok(result);
    } catch (err) {
      onMessage({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'AI request failed',
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-[#1d1a23]/80 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#d0bcff]">AI media tools</p>

      {features.imageEnhance && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-[#cbc3d7]">
            <Wand2 className="h-3.5 w-3.5 text-[#d0bcff]" />
            Enhance image (Gemini)
          </label>
          <input
            className="w-full rounded-lg border border-white/10 bg-[#15121b] px-3 py-2 text-xs text-white placeholder:text-[#958ea0]"
            placeholder="e.g. brighter lighting, white background, premium look"
            value={enhancePrompt}
            onChange={(e) => setEnhancePrompt(e.target.value)}
            disabled={disabled || !!busy}
          />
          <button
            type="button"
            disabled={disabled || !!busy || !selectedImageUrl}
            onClick={() =>
              void run('enhance', () => apiClient.studioEnhanceImage(token!, selectedImageUrl!, enhancePrompt), (r) => {
                onMediaAdded(r.media);
                onMessage({ type: 'ok', text: 'Image enhanced with Gemini' });
              })
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15 disabled:opacity-40"
          >
            {busy === 'enhance' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Enhance selected image
          </button>
          {!selectedImageUrl && (
            <p className="text-[10px] text-[#958ea0]">Upload or select an image in media assets first.</p>
          )}
        </div>
      )}

      {features.imageGenerate && (
        <div className="space-y-2 border-t border-white/5 pt-3">
          <label className="flex items-center gap-2 text-xs font-medium text-[#cbc3d7]">
            <ImagePlus className="h-3.5 w-3.5 text-[#d0bcff]" />
            Generate image (Gemini)
          </label>
          <textarea
            className="min-h-[56px] w-full resize-none rounded-lg border border-white/10 bg-[#15121b] px-3 py-2 text-xs text-white placeholder:text-[#958ea0]"
            placeholder="Describe the product shot you want…"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            disabled={disabled || !!busy}
          />
          <button
            type="button"
            disabled={disabled || !!busy || !imagePrompt.trim()}
            onClick={() =>
              void run(
                'gen-image',
                () => apiClient.studioGenerateImage(token!, { prompt: imagePrompt, aspectRatio }),
                (r) => {
                  onMediaAdded(r.media);
                  onMessage({ type: 'ok', text: 'Image generated with Gemini' });
                }
              )
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#d0bcff]/20 px-3 py-2 text-xs font-medium text-[#d0bcff] transition hover:bg-[#d0bcff]/30 disabled:opacity-40"
          >
            {busy === 'gen-image' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            Generate image
          </button>
        </div>
      )}

      {features.videoGenerate && (
        <div className="space-y-2 border-t border-white/5 pt-3">
          <label className="flex items-center gap-2 text-xs font-medium text-[#cbc3d7]">
            <Clapperboard className="h-3.5 w-3.5 text-[#4cd7f6]" />
            Generate video (Veo)
          </label>
          <textarea
            className="min-h-[56px] w-full resize-none rounded-lg border border-white/10 bg-[#15121b] px-3 py-2 text-xs text-white placeholder:text-[#958ea0]"
            placeholder="Describe motion / scene for a short product video…"
            value={videoPrompt}
            onChange={(e) => setVideoPrompt(e.target.value)}
            disabled={disabled || !!busy}
          />
          <button
            type="button"
            disabled={disabled || !!busy || !videoPrompt.trim()}
            onClick={() =>
              void run(
                'gen-video',
                () =>
                  apiClient.studioGenerateVideo(token!, {
                    prompt: videoPrompt,
                    imageUrl: selectedImageUrl,
                    aspectRatio,
                  }),
                (r) => {
                  onMediaAdded(r.media);
                  onMessage({ type: 'ok', text: 'Video generated with Veo (may take 1–3 min)' });
                }
              )
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#4cd7f6]/15 px-3 py-2 text-xs font-medium text-[#4cd7f6] transition hover:bg-[#4cd7f6]/25 disabled:opacity-40"
          >
            {busy === 'gen-video' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clapperboard className="h-3.5 w-3.5" />}
            Generate video {selectedImageUrl ? '(image-to-video)' : ''}
          </button>
          <p className="text-[10px] text-[#958ea0]">Uses Veo — requires paid Gemini API with video access.</p>
        </div>
      )}

      {features.imageTo3d && (
        <div className="space-y-2 border-t border-white/5 pt-3">
          <label className="flex items-center gap-2 text-xs font-medium text-[#cbc3d7]">
            <Box className="h-3.5 w-3.5 text-[#4fdbc8]" />
            Image to 3D (Hitem3D)
          </label>
          <button
            type="button"
            disabled={disabled || !!busy || !selectedImageUrl}
            onClick={() =>
              void run('3d', () => apiClient.studioImageTo3D(token!, selectedImageUrl!), (r) => {
                onMediaAdded(r.model);
                if (r.preview) onMediaAdded(r.preview);
                onMessage({ type: 'ok', text: '3D model ready (GLB saved to your media)' });
              })
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#4fdbc8]/15 px-3 py-2 text-xs font-medium text-[#4fdbc8] transition hover:bg-[#4fdbc8]/25 disabled:opacity-40"
          >
            {busy === '3d' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Box className="h-3.5 w-3.5" />}
            Convert to 3D model
          </button>
          <p className="text-[10px] text-[#958ea0]">Uses your Hitem3D API keys — typically 1–5 minutes.</p>
        </div>
      )}
    </div>
  );
}
