;

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  Package,
  Upload,
  Sparkles,
  ImagePlus,
  Clapperboard,
  Film,
  Music,
  Calendar,
  Save,
  Send,
  CheckCircle2,
  ChevronDown,
  LayoutTemplate,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient, Product, ApiError } from '@/lib/api';
import { PublishLinks } from '@/components/publish-links';
import { getPublishLinks } from '@/lib/publish-links';
import { YouTubePrivacySelector, type YouTubePrivacy } from '@/components/youtube-privacy-selector';
import {
  StudioPhonePreview,
  type PreviewPlatform,
} from '@/components/studio/studio-phone-preview';
import { StudioAiTools } from '@/components/studio/studio-ai-tools';
import styles from '@/pages/studio.module.css';

type StudioMediaItem = { type: 'image' | 'video' | 'model'; url: string; name: string };

const STUDIO_PLATFORMS: { id: PreviewPlatform; label: string; publish: boolean }[] = [
  { id: 'instagram', label: 'Instagram', publish: true },
  { id: 'facebook', label: 'Facebook', publish: true },
  { id: 'youtube', label: 'YouTube', publish: true },
  { id: 'tiktok', label: 'TikTok', publish: true },
  { id: 'whatsapp', label: 'WhatsApp', publish: false },
  { id: 'linkedin', label: 'LinkedIn', publish: false },
  { id: 'pinterest', label: 'Pinterest', publish: false },
  { id: 'telegram', label: 'Telegram', publish: false },
  { id: 'google', label: 'Google', publish: false },
];

const CONTENT_TABS = [
  { id: 'post', label: 'Post' },
  { id: 'reel', label: 'Reel / Short' },
  { id: 'story', label: 'Story' },
  { id: 'video', label: 'Full Video' },
] as const;

type ContentTab = (typeof CONTENT_TABS)[number]['id'];

const TONES = ['Engaging', 'Luxury', 'Playful', 'Minimal', 'Urgent sale'];

function isHostedMediaUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function mediaForApi(items: StudioMediaItem[]) {
  return items.filter((m) => isHostedMediaUrl(m.url) && m.type !== 'model');
}

interface StudioGenerated {
  caption: string;
  hashtags: string[];
  cta: string;
  headline: string;
}

interface ConnectionStatus {
  gemini: { ok: boolean; model?: string; message?: string };
  hitem3d: { ok: boolean; message?: string };
}

export default function StudioPage() {
  const { token } = useAuth();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState({
    gemini: false,
    hitem3d: false,
    model: '',
    features: {
      imageGenerate: false,
      imageEnhance: false,
      videoGenerate: false,
      imageTo3d: false,
    },
  });
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [connections, setConnections] = useState<ConnectionStatus | null>(null);
  const [productId, setProductId] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['instagram']);
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform>('instagram');
  const [contentTab, setContentTab] = useState<ContentTab>('post');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('1:1');
  const [musicOn, setMusicOn] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [media, setMedia] = useState<StudioMediaItem[]>([]);
  const [headline, setHeadline] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [cta, setCta] = useState('');
  const [tone, setTone] = useState('Engaging');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [youtubePrivacy, setYoutubePrivacy] = useState<YouTubePrivacy>('unlisted');
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [lastPublishResults, setLastPublishResults] = useState<
    Record<string, { ok: boolean; error?: string; platformPostId?: string; platformPostUrl?: string }> | null
  >(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  const selectedProduct = products.find((p) => p.id === productId);
  const previewMedia = media.find((m) => m.type === 'image' || m.type === 'video') || media[0];
  const selectedImage =
    media.filter((m) => m.type === 'image')[selectedMediaIndex]?.url ||
    media.find((m) => m.type === 'image')?.url;
  const hasHostedVideo = media.some((m) => m.type === 'video' && isHostedMediaUrl(m.url));
  const hasLocalOnlyVideo = media.some((m) => m.type === 'video' && !isHostedMediaUrl(m.url));
  const missingConnections = platforms.filter((p) => !connectedPlatforms.includes(p));
  const canPublish = verified && caption.trim().length > 0;
  const captionLen = caption.length;

  const load = useCallback(() => {
    if (!token) return;
    apiClient.getProducts(token).then((r) => {
      setProducts(r.products);
      if (r.products.length) setProductId((id) => id || r.products[0].id);
    });
    apiClient
      .getStudioConfig(token)
      .then((c) =>
        setConfig({
          gemini: c.gemini,
          hitem3d: c.hitem3d,
          model: c.model || '',
          features: c.features || {
            imageGenerate: c.gemini,
            imageEnhance: c.gemini,
            videoGenerate: c.gemini,
            imageTo3d: c.hitem3d,
          },
        })
      )
      .catch(() => {});
    apiClient
      .getSocialAccounts(token)
      .then((r) => setConnectedPlatforms(r.accounts.filter((a) => a.status === 'active').map((a) => a.platform)))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token) return;
    apiClient
      .studioTestConnections(token)
      .then(setConnections)
      .catch(() => setConnections(null));
  }, [token]);

  useEffect(() => {
    if (!selectedProduct) return;
    const imgs = (selectedProduct.images || []).map((img, i) => ({
      type: 'image' as const,
      url: img.url,
      name: img.alt || `Product ${i + 1}`,
    }));
    if (imgs.length) setMedia(imgs);
  }, [selectedProduct?.id]);

  useEffect(() => {
    setVerified(false);
  }, [caption, headline, hashtags, cta, media, platforms]);

  useEffect(() => {
    if (contentTab === 'post') setAspectRatio('1:1');
    if (contentTab === 'reel' || contentTab === 'story') setAspectRatio('9:16');
    if (contentTab === 'video') setAspectRatio('16:9');
  }, [contentTab]);

  function togglePublishPlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((x) => x !== p) : prev) : [...prev, p]
    );
  }

  function onStudioPlatformClick(id: PreviewPlatform, publish: boolean) {
    setPreviewPlatform(id);
    if (publish) togglePublishPlatform(id);
  }

  async function onFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') {
    const files = e.target.files;
    if (!files?.length || !token) return;
    setUploadingMedia(true);
    setMessage(null);
    try {
      for (const file of Array.from(files)) {
        const { media: uploaded } = await apiClient.uploadStudioMedia(token, file);
        setMedia((m) => [
          ...m,
          { type: uploaded.type || type, url: uploaded.url, name: uploaded.name || file.name },
        ]);
      }
      setMessage({ type: 'ok', text: 'Media uploaded — ready for publishing.' });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Upload failed.',
      });
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  }

  async function handleGenerate() {
    if (!token) return;
    setGenerating(true);
    setMessage(null);
    try {
      const { generated } = await apiClient.studioGenerate(token, {
        productId: productId || undefined,
        platforms,
        tone,
        customPrompt,
        mediaUrls: mediaForApi(media.filter((m) => m.type === 'image')).map((m) => m.url),
      });
      const g = generated as StudioGenerated;
      setHeadline(g.headline || '');
      setCaption(g.caption || '');
      setHashtags((g.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' '));
      setCta(g.cta || '');
      setMessage({ type: 'ok', text: 'Caption enhanced with Gemini AI' });
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof ApiError ? err.message : 'Generation failed' });
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft() {
    if (!token) return;
    setSaving(true);
    try {
      await apiClient.studioSaveDraft(token, {
        productId,
        platforms,
        caption,
        headline,
        hashtags: hashtags.split(/\s+/).filter(Boolean),
        cta,
        media: mediaForApi(media),
        tone,
      });
      setMessage({ type: 'ok', text: 'Draft saved' });
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof ApiError ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  async function schedulePost(publishNow = false) {
    if (!token || !canPublish) {
      setMessage({ type: 'err', text: 'Add a caption and confirm preview before publishing.' });
      return;
    }
    if (platforms.includes('youtube') && !hasHostedVideo) {
      setMessage({
        type: 'err',
        text: hasLocalOnlyVideo
          ? 'Wait for video upload to finish.'
          : 'YouTube requires a video — upload mp4/mov in Media Assets.',
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    setLastPublishResults(null);
    try {
      const draftRes = await apiClient.studioSaveDraft(token, {
        productId,
        platforms,
        caption,
        headline,
        hashtags: hashtags.split(/\s+/).filter(Boolean),
        cta,
        media: mediaForApi(media),
        tone,
      });
      const scheduleRes = await apiClient.studioScheduleDraft(token, draftRes.draft.id, {
        publishNow,
        youtubePrivacy: platforms.includes('youtube') ? youtubePrivacy : undefined,
        scheduledAt: publishNow
          ? undefined
          : scheduledAt
            ? new Date(scheduledAt).toISOString()
            : new Date(Date.now() + 3600000).toISOString(),
      });
      if (publishNow && scheduleRes.scheduledPost?.id) {
        const pub = await apiClient.publishNow(token, scheduleRes.scheduledPost.id);
        if (pub.status === 'failed') {
          const errMsg = Object.values(pub.results || {})
            .map((r) => r.error)
            .filter(Boolean)
            .join('; ');
          setMessage({ type: 'err', text: errMsg || 'Publish failed' });
          if (pub.results) setLastPublishResults(pub.results);
        } else {
          if (pub.results) setLastPublishResults(pub.results);
          const linkCount = getPublishLinks(pub.results).length;
          setMessage({
            type: 'ok',
            text:
              linkCount > 0
                ? `Published on ${linkCount} platform${linkCount > 1 ? 's' : ''}!`
                : 'Published successfully.',
          });
        }
      } else {
        setMessage({ type: 'ok', text: 'Scheduled — see Posts page.' });
      }
      setVerified(false);
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof ApiError ? err.message : 'Schedule failed' });
    } finally {
      setSaving(false);
    }
  }

  const fullCaption = [caption, hashtags, cta].filter(Boolean).join('\n\n');

  return (
    <div className={styles.workspace}>
      {/* Left: Creation */}
      <section className={styles.creationPanel}>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[32px] font-semibold leading-10 tracking-tight text-[#e7e0ed]">
              Content Studio
            </h2>
            <p className="mt-1 text-[#cbc3d7] opacity-70">
              Craft high-performance automated social content for multi-platform distribution.
            </p>
            <p className="mt-2 text-xs text-[#958ea0]">
              Gemini{' '}
              {connections?.gemini?.ok ? (
                <span className="text-[#4fdbc8]">connected</span>
              ) : (
                <span className="text-amber-400/80">offline</span>
              )}
              {' · '}
              Hitem3D{' '}
              {connections?.hitem3d?.ok ? (
                <span className="text-[#4fdbc8]">connected</span>
              ) : (
                <span className="text-amber-400/80">offline</span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              className={`${styles.labelCaps} flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2 transition hover:bg-white/5`}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <LayoutTemplate className="h-4 w-4" />
              {showAdvanced ? 'Hide' : 'Advanced'}
            </button>
            <button
              type="button"
              disabled={saving || !canPublish}
              onClick={() => void schedulePost(true)}
              className={`${styles.btnPrimary} flex items-center gap-2 rounded-xl px-6 py-2 transition disabled:opacity-40`}
            >
              <Send className="h-4 w-4" />
              Publish Now
            </button>
          </div>
        </div>

        {message && (
          <motion.div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              message.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/30 bg-red-500/10 text-red-200'
            }`}
          >
            {message.text}
            {lastPublishResults && getPublishLinks(lastPublishResults).length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <PublishLinks results={lastPublishResults} />
              </div>
            )}
          </motion.div>
        )}

        {/* Content tabs */}
        <div className={`${styles.glassBorder} mb-6 flex w-fit rounded-xl p-1`}>
          {CONTENT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setContentTab(tab.id)}
              className={`${styles.labelCaps} rounded-lg px-6 py-2 transition ${
                contentTab === tab.id ? styles.tabActive : 'text-[#cbc3d7] hover:text-[#e7e0ed]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Product */}
          <div>
            <label className={`${styles.labelCaps} mb-2 block text-[#cbc3d7]`}>Linked Product</label>
            <div className="relative">
              <Package className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#d0bcff] opacity-70" />
              <select
                className={`${styles.selectField} py-3 pl-12 pr-10`}
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Select a product to promote…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — ₹{p.price}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#958ea0]" />
            </div>
          </div>

          {/* Publish targets */}
          <div>
            <label className={`${styles.labelCaps} mb-2 block text-[#cbc3d7]`}>Publish to</label>
            <div className="flex flex-wrap gap-2">
              {STUDIO_PLATFORMS.map((p) => {
                const isPreview = previewPlatform === p.id;
                const isPublishing = p.publish && platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onStudioPlatformClick(p.id, p.publish)}
                    className={`${styles.labelCaps} rounded-lg px-4 py-2 transition ${
                      isPreview || isPublishing
                        ? styles.tabActive
                        : 'border border-white/10 text-[#cbc3d7] hover:text-[#e7e0ed]'
                    } ${!p.publish ? 'opacity-80' : ''}`}
                    title={p.publish ? 'Publish & preview' : 'Preview only'}
                  >
                    {p.label}
                    {p.publish && isPublishing && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#4cd7f6]" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-[#958ea0]">
              Instagram, Facebook, YouTube & TikTok publish live · others update the phone preview
            </p>
          </div>

          {/* Media */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={`${styles.labelCaps} text-[#cbc3d7]`}>Media Assets</label>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#958ea0]/50">
                AI Studio
              </span>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploadingMedia}
              onChange={(e) => void onFileUpload(e, 'image')}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              disabled={uploadingMedia}
              onChange={(e) => void onFileUpload(e, 'video')}
            />
            <div className="grid h-48 grid-cols-4 gap-4">
              <button
                type="button"
                disabled={uploadingMedia}
                onClick={() => imageInputRef.current?.click()}
                className="col-span-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 px-4 transition hover:bg-white/10"
              >
                <Upload className="h-8 w-8 text-[#d0bcff]" />
                <div className="text-center">
                  <p className="text-xs font-medium">Upload Media</p>
                  <p className="text-[10px] text-[#cbc3d7] opacity-60">
                    {uploadingMedia ? 'Uploading…' : 'Drag & drop assets'}
                  </p>
                </div>
              </button>
              <div className="col-span-2 grid grid-rows-3 gap-2">
                <button
                  type="button"
                  onClick={() => setContentTab('post')}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-[#2c2832] px-4 text-left transition hover:bg-[#37333d]"
                >
                  <ImagePlus className="h-5 w-5 text-[#d0bcff] transition group-hover:scale-110" />
                  <div>
                    <p className="text-xs font-semibold">AI image</p>
                    <p className="text-[10px] text-[#cbc3d7]/70">Gemini generate / enhance</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setContentTab('reel')}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-[#2c2832] px-4 text-left transition hover:bg-[#37333d]"
                >
                  <Clapperboard className="h-5 w-5 text-[#4cd7f6] transition group-hover:scale-110" />
                  <div>
                    <p className="text-xs font-semibold">AI reel (Veo)</p>
                    <p className="text-[10px] text-[#cbc3d7]/70">Short video from prompt</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setContentTab('video')}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-[#2c2832] px-4 text-left transition hover:bg-[#37333d]"
                >
                  <Film className="h-5 w-5 text-[#4fdbc8] transition group-hover:scale-110" />
                  <div>
                    <p className="text-xs font-semibold">3D product</p>
                    <p className="text-[10px] text-[#cbc3d7]/70">Hitem3D image → GLB</p>
                  </div>
                </button>
              </div>
            </div>
            {media.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {media.map((m, i) => {
                  const imageIdx = media.slice(0, i).filter((x) => x.type === 'image').length;
                  const isSelected = m.type === 'image' && imageIdx === selectedMediaIndex;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => m.type === 'image' && setSelectedMediaIndex(imageIdx)}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                        isSelected ? 'border-[#d0bcff]' : 'border-transparent'
                      }`}
                    >
                      {m.type === 'image' ? (
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                      ) : m.type === 'video' ? (
                        <video src={m.url} className="h-full w-full object-cover" muted />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#2c2832] text-[10px] text-[#4fdbc8]">
                          3D
                        </div>
                      )}
                      <span
                        role="button"
                        tabIndex={0}
                        className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1 text-[10px] text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMedia((list) => list.filter((_, j) => j !== i));
                        }}
                      >
                        ×
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <StudioAiTools
              token={token}
              aspectRatio={aspectRatio}
              features={config.features}
              selectedImageUrl={selectedImage}
              disabled={uploadingMedia}
              onMediaAdded={(item) => setMedia((m) => [...m, item])}
              onMessage={setMessage}
            />
          </div>

          {/* Caption */}
          <div>
            <motion.div className="mb-2 flex items-end justify-between">
              <label className={`${styles.labelCaps} text-[#cbc3d7]`}>Caption &amp; Hashtags</label>
              <button
                type="button"
                disabled={generating || (!config.gemini && !connections?.gemini?.ok)}
                onClick={() => void handleGenerate()}
                className={`${styles.btnGradient} flex items-center gap-2 rounded-full px-4 py-1.5 shadow-lg transition active:scale-95 disabled:opacity-50`}
              >
                {generating ? (
                  <span className="text-xs">Enhancing…</span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Enhance with AI
                  </>
                )}
              </button>
            </motion.div>
            <div className="relative">
              <textarea
                className={`${styles.inputField} min-h-[120px] resize-none py-4`}
                placeholder="Write your hook or video description here…"
                rows={4}
                maxLength={5000}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              <div className="absolute bottom-3 right-4 text-sm text-[#958ea0] opacity-40">
                {captionLen} / 5000
              </div>
            </div>
            {hashtags && (
              <p className="mt-2 text-xs text-[#4cd7f6]">{hashtags}</p>
            )}
          </div>

          {/* Format row */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <label className={`${styles.labelCaps} mb-2 block text-[#cbc3d7]`}>Aspect Ratio</label>
              <motion.div className="flex gap-2">
                {(['1:1', '9:16', '16:9'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspectRatio(r)}
                    className={`${styles.labelCaps} flex-1 rounded-lg border py-2 text-[10px] transition ${
                      aspectRatio === r ? styles.ratioActive : 'border-white/10 text-[#cbc3d7]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </motion.div>
            </div>
            <div>
              <label className={`${styles.labelCaps} mb-2 block text-[#cbc3d7]`}>Background Music</label>
              <div className="flex h-10 items-center justify-between rounded-xl border border-white/10 bg-[#1d1a23] px-4">
                <Music className="h-4 w-4 text-[#d0bcff]" />
                <input
                  type="checkbox"
                  checked={musicOn}
                  onChange={(e) => setMusicOn(e.target.checked)}
                  className="h-5 w-5 cursor-pointer accent-[#d0bcff]"
                />
              </div>
            </div>
            <div>
              <label className={`${styles.labelCaps} mb-2 block text-[#cbc3d7]`}>Schedule Time</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#958ea0]" />
                <input
                  type="datetime-local"
                  className={`${styles.inputField} py-2 pl-9 text-sm`}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Verify + actions */}
          <div className={`${styles.glassPanel} mt-4 space-y-4 rounded-xl p-4`}>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#d0bcff]"
              />
              <span className="text-sm text-[#cbc3d7]">
                I reviewed the live preview and confirm this post is ready to publish.
              </span>
            </label>
            {platforms.includes('youtube') && (
              <YouTubePrivacySelector value={youtubePrivacy} onChange={setYoutubePrivacy} disabled={saving} />
            )}
            {missingConnections.length > 0 && (
              <p className="text-xs text-amber-400">
                Not connected: {missingConnections.join(', ')}.{' '}
                <Link href="/social" className="text-[#d0bcff] underline">
                  Connect
                </Link>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDraft()}
                className={`${styles.labelCaps} flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2 transition hover:bg-white/5`}
              >
                <Save className="h-4 w-4" />
                Save draft
              </button>
              <button
                type="button"
                disabled={saving || !canPublish}
                onClick={() => void schedulePost(false)}
                className={`${styles.labelCaps} flex items-center gap-2 rounded-xl border border-[#d0bcff]/30 bg-[#d0bcff]/10 px-5 py-2 text-[#d0bcff] transition disabled:opacity-40`}
              >
                <Calendar className="h-4 w-4" />
                Schedule
              </button>
            </div>
          </div>

          {showAdvanced && (
            <div className={`${styles.glassPanel} space-y-3 rounded-xl p-4`}>
              <p className={`${styles.labelCaps} text-[#cbc3d7]`}>Advanced copy</p>
              <input
                className={styles.inputField}
                placeholder="Headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
              <input
                className={styles.inputField}
                placeholder="Hashtags"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
              />
              <input
                className={styles.inputField}
                placeholder="CTA"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
              />
              <select className={styles.inputField} value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <textarea
                className={`${styles.inputField} min-h-[72px] resize-none`}
                placeholder="Extra AI instructions…"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>
          )}
        </div>
      </section>

      {/* Right: Preview */}
      <section className={styles.previewPanel}>
        <div className={styles.glowBg} />


        <StudioPhonePreview
          platform={previewPlatform}
          caption={fullCaption}
          headline={headline}
          hashtags={hashtags}
          mediaUrl={previewMedia?.url}
          mediaType={previewMedia?.type}
        />
      </section>
    </div>
  );
}
