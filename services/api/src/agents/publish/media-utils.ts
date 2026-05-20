function isPublicUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

const VIDEO_EXT = /\.(mp4|mov|webm|m4v|avi)(\?|$)/i;

export function collectImageUrls(
  post: Record<string, unknown>,
  product?: Record<string, unknown> | null
): string[] {
  const urls: string[] = [];
  const fromPost = (post.mediaUrls as string[]) || [];
  urls.push(...fromPost.filter(isPublicUrl));

  const media = (post.media as { url?: string; type?: string }[]) || [];
  for (const m of media) {
    if (!m.url) continue;
    if (m.type === 'video') continue;
    if (isPublicUrl(m.url) || (isDataUrl(m.url) && m.url.startsWith('data:image'))) {
      if (m.type === 'image' || !m.type || isDataUrl(m.url)) urls.push(m.url);
    }
  }

  if (product?.images) {
    for (const img of product.images as { url: string }[]) {
      if (img.url && isPublicUrl(img.url)) urls.push(img.url);
    }
  }

  return [...new Set(urls)];
}

export function collectVideoUrls(post: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const media = (post.media as { url?: string; type?: string; name?: string }[]) || [];

  for (const m of media) {
    if (!m.url) continue;
    if (m.type === 'video') {
      urls.push(m.url);
      continue;
    }
    if (isPublicUrl(m.url) && (VIDEO_EXT.test(m.url) || VIDEO_EXT.test(m.name || ''))) {
      urls.push(m.url);
    }
  }

  return [...new Set(urls)];
}

export function buildYouTubeTitle(
  caption: string,
  product: Record<string, unknown> | null,
  headline?: string
): string {
  const fromHeadline = (headline || '').trim();
  if (fromHeadline) return fromHeadline.slice(0, 100);
  const firstLine = caption.split('\n')[0]?.trim();
  if (firstLine && firstLine.length <= 100) return firstLine;
  if (product?.title) return String(product.title).slice(0, 100);
  return 'New video';
}
