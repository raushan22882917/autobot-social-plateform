'use client';


import { useState } from 'react';
import { ImagePlus, Sparkles, Clapperboard, Wand2, Loader2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';

type MediaItem = { type: 'image' | 'video' | 'model'; url: string; name: string };

type StudioContentFormat = 'post' | 'reel' | 'story';

interface StudioAiToolsProps {
  token: string | null;
  contentFormat: StudioContentFormat;
  aspectRatio: '1:1' | '9:16';
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
  contentFormat,
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
    <div className="mt-4 space-y-3 rounded-2xl border border-border bg-muted p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-instagram">AI media tools</p>

      {contentFormat === 'post' && features.imageEnhance && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Wand2 className="h-3.5 w-3.5 text-brand-instagram" />
            Enhance image (Gemini)
          </label>
          <input
            className="field-input w-full py-2 text-xs"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-facebook/10 px-3 py-2 text-xs font-medium text-brand-facebook transition hover:bg-brand-facebook/15 disabled:opacity-40"
          >
            {busy === 'enhance' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Enhance selected image
          </button>
          {!selectedImageUrl && (
            <p className="text-[10px] text-muted-foreground">Upload or select an image in media assets first.</p>
          )}
        </div>
      )}

      {(contentFormat === 'post' || contentFormat === 'story') && features.imageGenerate && (
        <div className="space-y-2 border-t border-border pt-3">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ImagePlus className="h-3.5 w-3.5 text-brand-instagram" />
            Generate image (Gemini)
          </label>
          <textarea
            className="field-input min-h-[56px] w-full resize-none py-2 text-xs"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-instagram/15 px-3 py-2 text-xs font-medium text-brand-instagram transition hover:bg-brand-instagram/25 disabled:opacity-40"
          >
            {busy === 'gen-image' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            Generate image
          </button>
        </div>
      )}

      {(contentFormat === 'reel' || contentFormat === 'story') && features.videoGenerate && (
        <div className="space-y-2 border-t border-border pt-3">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Clapperboard className="h-3.5 w-3.5 text-brand-facebook" />
            Generate video (Veo)
          </label>
          <textarea
            className="field-input min-h-[56px] w-full resize-none py-2 text-xs"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-facebook/15 px-3 py-2 text-xs font-medium text-brand-facebook transition hover:bg-brand-facebook/25 disabled:opacity-40"
          >
            {busy === 'gen-video' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clapperboard className="h-3.5 w-3.5" />}
            Generate video {selectedImageUrl ? '(image-to-video)' : ''}
          </button>
          <p className="text-[10px] text-muted-foreground">Uses Veo — requires paid Gemini API with video access.</p>
        </div>
      )}

    </div>
  );
}
