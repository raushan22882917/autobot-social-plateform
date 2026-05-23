'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Package,
  Upload,
  Sparkles,
  ImagePlus,
  Clapperboard,
  Circle,
  Video,
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
import styles from './studio.module.css';

type StudioMediaItem = { type: 'image' | 'video' | 'model'; url: string; name: string };

const STUDIO_PLATFORMS: { id: PreviewPlatform; label: string; publish: boolean }[] = [
  { id: 'instagram', label: 'Instagram', publish: true },
  { id: 'facebook', label: 'Facebook', publish: true },
  { id: 'youtube', label: 'YouTube', publish: true },
  { id: 'whatsapp', label: 'WhatsApp', publish: true },
  { id: 'pinterest', label: 'Pinterest', publish: false },
  { id: 'google', label: 'Google', publish: false },
];

const CONTENT_TABS = [
  { id: 'post', label: 'Post' },
  { id: 'reel', label: 'Reels' },
  { id: 'story', label: 'Story' },
] as const;

type ContentFormat = (typeof CONTENT_TABS)[number]['id'];

const ASPECT_BY_FORMAT: Record<ContentFormat, '1:1' | '9:16'> = {
  post: '1:1',
  reel: '9:16',
  story: '9:16',
};

const TONES = ['Engaging', 'Luxury', 'Playful', 'Minimal', 'Urgent sale'];

function isHostedMediaUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function mediaForApi(items: StudioMediaItem[]) {
  return items.filter((m) => isHostedMediaUrl(m.url) && m.type !== 'model');
}

function isUploadableFile(file: File) {
  if (file.type.startsWith('image/') || file.type.startsWith('video/')) return true;
  return /\.(jpe?g|png|gif|webp|mp4|mov|webm|m4v)$/i.test(file.name);
}

function inferUploadType(file: File): 'image' | 'video' {
  if (file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name)) return 'video';
  return 'image';
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
  const [selectedPreviewIdx, setSelectedPreviewIdx] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [connections, setConnections] = useState<ConnectionStatus | null>(null);
  const [productId, setProductId] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['instagram']);
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform>('instagram');
  const [contentFormat, setContentFormat] = useState<ContentFormat>('post');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16'>('1:1');
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
  const previewMedia =
    media[selectedPreviewIdx] ||
    media.find((m) => m.type === 'video') ||
    media.find((m) => m.type === 'image') ||
    media[0];
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
          features: {
            imageGenerate: c.features?.imageGenerate ?? c.gemini,
            imageEnhance: c.features?.imageEnhance ?? c.gemini,
            videoGenerate: c.features?.videoGenerate ?? c.gemini,
            imageTo3d: c.features?.imageTo3d ?? c.hitem3d,
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
    setAspectRatio(ASPECT_BY_FORMAT[contentFormat]);
  }, [contentFormat]);

  useEffect(() => {
    if (selectedPreviewIdx >= media.length) {
      setSelectedPreviewIdx(Math.max(0, media.length - 1));
    }
  }, [media.length, selectedPreviewIdx]);

  function togglePublishPlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((x) => x !== p) : prev) : [...prev, p]
    );
  }

  function onStudioPlatformClick(id: PreviewPlatform, publish: boolean) {
    setPreviewPlatform(id);
    if (publish) togglePublishPlatform(id);
  }

  async function uploadFiles(fileList: FileList | File[]) {
    if (!token) return;
    const files = Array.from(fileList).filter(isUploadableFile);
    if (!files.length) {
      setMessage({ type: 'err', text: 'Choose an image (jpg, png, webp) or video (mp4, mov, webm).' });
      return;
    }
    setUploadingMedia(true);
    setMessage(null);
    try {
      const added: StudioMediaItem[] = [];
      for (const file of files) {
        const { media: uploaded } = await apiClient.uploadStudioMedia(token, file);
        const itemType = (uploaded.type || inferUploadType(file)) as StudioMediaItem['type'];
        added.push({
          type: itemType,
          url: uploaded.url,
          name: uploaded.name || file.name,
        });
      }
      const startLen = media.length;
      setMedia((m) => [...m, ...added]);
      const videoOffset = added.findIndex((item) => item.type === 'video');
      if (videoOffset >= 0) {
        setSelectedPreviewIdx(startLen + videoOffset);
        if (contentFormat === 'post') setContentFormat('reel');
      }
      setMessage({ type: 'ok', text: 'Media uploaded — ready for publishing.' });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Upload failed.',
      });
    } finally {
      setUploadingMedia(false);
    }
  }

  async function onFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    await uploadFiles(files);
    e.target.value = '';
  }

  function onMediaDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (uploadingMedia || !e.dataTransfer.files.length) return;
    void uploadFiles(e.dataTransfer.files);
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
        contentFormat,
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
        contentFormat,
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
            <p className="mt-1 text-muted-foreground opacity-70">
              Craft high-performance automated social content for multi-platform distribution.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Gemini{' '}
              {connections?.gemini?.ok ? (
                <span className="text-[brand-whatsapp]">connected</span>
              ) : (
                <span className="text-brand-google-yellow/80">offline</span>
              )}
              {' · '}
              Hitem3D{' '}
              {connections?.hitem3d?.ok ? (
                <span className="text-[brand-whatsapp]">connected</span>
              ) : (
                <span className="text-brand-google-yellow/80">offline</span>
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
              onClick={() => setContentFormat(tab.id)}
              className={`${styles.labelCaps} rounded-lg px-6 py-2 transition ${
                contentFormat === tab.id ? styles.tabActive : 'text-muted-foreground hover:text-[#e7e0ed]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Product */}
          <div>
            <label className={`${styles.labelCaps} mb-2 block text-muted-foreground`}>Linked Product</label>
            <div className="relative">
              <Package className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-instagram opacity-70" />
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
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Publish targets */}
          <div>
            <label className={`${styles.labelCaps} mb-2 block text-muted-foreground`}>Publish to</label>
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
                        : 'border border-white/10 text-muted-foreground hover:text-[#e7e0ed]'
                    } ${!p.publish ? 'opacity-80' : ''}`}
                    title={p.publish ? 'Publish & preview' : 'Preview only'}
                  >
                    {p.label}
                    {p.publish && isPublishing && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[brand-facebook]" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Instagram, Facebook, YouTube & WhatsApp publish live · others update the phone preview
            </p>
          </div>

          {/* Media */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={`${styles.labelCaps} text-muted-foreground`}>Media Assets</label>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                AI Studio
              </span>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              disabled={uploadingMedia}
              onChange={(e) => void onFileUpload(e)}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
              multiple
              className="hidden"
              disabled={uploadingMedia}
              onChange={(e) => void onFileUpload(e)}
            />
            <div className="grid min-h-[12rem] grid-cols-4 gap-4">
              <div
                className={`col-span-2 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 transition ${
                  dragOver
                    ? 'border-[brand-facebook] bg-[brand-facebook]/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => setDragOver(false)}
                onDrop={onMediaDrop}
              >
                <Upload className="h-8 w-8 text-brand-instagram" />
                <div className="text-center">
                  <p className="text-xs font-medium">Upload your media</p>
                  <p className="text-[10px] text-muted-foreground opacity-60">
                    {uploadingMedia ? 'Uploading…' : 'Drag & drop images or videos'}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Images up to 10MB · Videos up to 100MB</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    disabled={uploadingMedia}
                    onClick={() => imageInputRef.current?.click()}
                    className={`${styles.labelCaps} flex items-center gap-2 rounded-lg border border-white/15 bg-[#2c2832] px-3 py-2 text-[10px] text-[#e7e0ed] transition hover:bg-[#37333d] disabled:opacity-50`}
                  >
                    <ImagePlus className="h-4 w-4 text-brand-instagram" />
                    Upload image
                  </button>
                  <button
                    type="button"
                    disabled={uploadingMedia}
                    onClick={() => videoInputRef.current?.click()}
                    className={`${styles.labelCaps} flex items-center gap-2 rounded-lg border border-white/15 bg-[#2c2832] px-3 py-2 text-[10px] text-[#e7e0ed] transition hover:bg-[#37333d] disabled:opacity-50`}
                  >
                    <Video className="h-4 w-4 text-[brand-facebook]" />
                    Upload video
                  </button>
                </div>
              </div>
              <div className="col-span-2 grid grid-rows-3 gap-2">
                <button
                  type="button"
                  onClick={() => setContentFormat('post')}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-[#2c2832] px-4 text-left transition hover:bg-[#37333d]"
                >
                  <ImagePlus className="h-5 w-5 text-brand-instagram transition group-hover:scale-110" />
                  <div>
                    <p className="text-xs font-semibold">Post</p>
                    <p className="text-[10px] text-muted-foreground/70">Square feed · 1:1</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setContentFormat('reel')}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-[#2c2832] px-4 text-left transition hover:bg-[#37333d]"
                >
                  <Clapperboard className="h-5 w-5 text-[brand-facebook] transition group-hover:scale-110" />
                  <div>
                    <p className="text-xs font-semibold">Reels</p>
                    <p className="text-[10px] text-muted-foreground/70">Short video · 9:16</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setContentFormat('story')}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-[#2c2832] px-4 text-left transition hover:bg-[#37333d]"
                >
                  <Circle className="h-5 w-5 text-[brand-whatsapp] transition group-hover:scale-110" />
                  <div>
                    <p className="text-xs font-semibold">Story</p>
                    <p className="text-[10px] text-muted-foreground/70">24h vertical · 9:16</p>
                  </div>
                </button>
              </div>
            </div>
            {media.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {media.map((m, i) => {
                  const imageIdx = media.slice(0, i).filter((x) => x.type === 'image').length;
                  const isPreviewSelected = i === selectedPreviewIdx;
                  return (
                    <button
                      key={`${m.url}-${i}`}
                      type="button"
                      onClick={() => {
                        setSelectedPreviewIdx(i);
                        if (m.type === 'image') setSelectedMediaIndex(imageIdx);
                      }}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                        isPreviewSelected ? 'border-brand-instagram' : 'border-transparent'
                      }`}
                      title={m.name}
                    >
                      {m.type === 'image' ? (
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                      ) : m.type === 'video' ? (
                        <>
                          <video src={m.url} className="h-full w-full object-cover" muted />
                          <span className="absolute bottom-0.5 left-0.5 rounded bg-black/75 px-1 text-[9px] font-bold text-[brand-facebook]">
                            VIDEO
                          </span>
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#2c2832] text-[10px] text-[brand-whatsapp]">
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
                          setSelectedPreviewIdx((idx) => {
                            if (idx === i) return Math.max(0, i - 1);
                            if (idx > i) return idx - 1;
                            return idx;
                          });
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
              contentFormat={contentFormat}
              aspectRatio={aspectRatio}
              features={config.features}
              selectedImageUrl={selectedImage}
              disabled={uploadingMedia}
              onMediaAdded={(item) => {
                setMedia((m) => [...m, item]);
                if (item.type === 'video' && contentFormat === 'post') setContentFormat('reel');
              }}
              onMessage={setMessage}
            />
          </div>

          {/* Caption */}
          <div>
            <motion.div className="mb-2 flex items-end justify-between">
              <label className={`${styles.labelCaps} text-muted-foreground`}>Caption &amp; Hashtags</label>
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
              <div className="absolute bottom-3 right-4 text-sm text-muted-foreground opacity-40">
                {captionLen} / 5000
              </div>
            </div>
            {hashtags && (
              <p className="mt-2 text-xs text-[brand-facebook]">{hashtags}</p>
            )}
          </div>

          {/* Format row */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <label className={`${styles.labelCaps} mb-2 block text-muted-foreground`}>Aspect ratio</label>
              <div
                className={`${styles.labelCaps} flex items-center justify-center rounded-lg border py-2 text-[10px] ${styles.ratioActive}`}
              >
                {aspectRatio}
                <span className="ml-1 font-normal normal-case text-muted-foreground/80">
                  ({contentFormat === 'post' ? 'Post' : contentFormat === 'reel' ? 'Reels' : 'Story'})
                </span>
              </div>
            </div>
            <div>
              <label className={`${styles.labelCaps} mb-2 block text-muted-foreground`}>Background Music</label>
              <div className="flex h-10 items-center justify-between rounded-xl border border-white/10 bg-[#1d1a23] px-4">
                <Music className="h-4 w-4 text-brand-instagram" />
                <input
                  type="checkbox"
                  checked={musicOn}
                  onChange={(e) => setMusicOn(e.target.checked)}
                  className="h-5 w-5 cursor-pointer accent-brand-instagram"
                />
              </div>
            </div>
            <div>
              <label className={`${styles.labelCaps} mb-2 block text-muted-foreground`}>Schedule Time</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                className="mt-1 h-4 w-4 accent-brand-instagram"
              />
              <span className="text-sm text-muted-foreground">
                I reviewed the live preview and confirm this post is ready to publish.
              </span>
            </label>
            {platforms.includes('youtube') && (
              <YouTubePrivacySelector value={youtubePrivacy} onChange={setYoutubePrivacy} disabled={saving} />
            )}
            {missingConnections.length > 0 && (
              <p className="text-xs text-brand-google-yellow">
                Not connected: {missingConnections.join(', ')}.{' '}
                <Link href="/social" className="text-brand-instagram underline">
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
                className={`${styles.labelCaps} flex items-center gap-2 rounded-xl border border-brand-instagram/30 bg-brand-instagram/10 px-5 py-2 text-brand-instagram transition disabled:opacity-40`}
              >
                <Calendar className="h-4 w-4" />
                Schedule
              </button>
            </div>
          </div>

          {showAdvanced && (
            <div className={`${styles.glassPanel} space-y-3 rounded-xl p-4`}>
              <p className={`${styles.labelCaps} text-muted-foreground`}>Advanced copy</p>
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
          contentFormat={contentFormat}
          caption={fullCaption}
          headline={headline}
          hashtags={hashtags}
          mediaUrl={previewMedia?.url}
          mediaType={previewMedia?.type === 'video' ? 'video' : previewMedia?.url ? 'image' : undefined}
        />
      </section>
    </div>
  );
}
