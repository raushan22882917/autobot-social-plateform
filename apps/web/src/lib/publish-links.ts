export interface PublishResult {
  ok: boolean;
  error?: string;
  platformPostId?: string;
  platformPostUrl?: string;
}

export function resolvePublishUrl(platform: string, result: PublishResult): string | undefined {
  if (result.platformPostUrl) return result.platformPostUrl;
  const id = result.platformPostId;
  if (!id || !result.ok) return undefined;
  if (platform === 'youtube') return `https://www.youtube.com/watch?v=${id}`;
  if (platform === 'facebook' && id.includes('_')) {
    const [pageId, storyId] = id.split('_');
    return `https://www.facebook.com/${pageId}/posts/${storyId}`;
  }
  return undefined;
}

export function getPublishLinks(results?: Record<string, PublishResult>) {
  if (!results) return [];
  return Object.entries(results)
    .map(([platform, result]) => {
      const url = resolvePublishUrl(platform, result);
      return url ? { platform, url, ok: result.ok } : null;
    })
    .filter((x): x is { platform: string; url: string; ok: boolean } => Boolean(x));
}
