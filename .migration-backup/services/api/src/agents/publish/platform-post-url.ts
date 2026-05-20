const GRAPH = 'https://graph.facebook.com/v21.0';

export function buildYouTubePostUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildFacebookPostUrl(postId: string, pageId?: string): string | undefined {
  if (!postId || postId === 'unknown') return undefined;
  if (postId.includes('_')) {
    const [pid, storyId] = postId.split('_');
    return `https://www.facebook.com/${pid}/posts/${storyId}`;
  }
  if (pageId) return `https://www.facebook.com/${pageId}/posts/${postId}`;
  return `https://www.facebook.com/${postId}`;
}

export async function fetchInstagramPermalink(
  mediaId: string,
  accessToken: string
): Promise<string | undefined> {
  try {
    const params = new URLSearchParams({
      fields: 'permalink',
      access_token: accessToken,
    });
    const res = await fetch(`${GRAPH}/${mediaId}?${params}`);
    const data = (await res.json()) as { permalink?: string; error?: { message: string } };
    if (!res.ok) return undefined;
    return data.permalink;
  } catch {
    return undefined;
  }
}
