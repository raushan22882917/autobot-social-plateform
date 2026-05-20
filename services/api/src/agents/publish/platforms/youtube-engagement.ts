import { refreshGoogleAccessToken } from './youtube-publish';
import type { SocialCredentials } from '../../social-connect/token-store';
import type { PlatformEngagement, SocialComment } from './meta-engagement';

const YT = 'https://www.googleapis.com/youtube/v3';

async function ytGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${YT}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error((data as { error?: { message?: string } }).error?.message || `YouTube API error (${res.status})`);
  }
  return data;
}

async function resolveToken(creds: SocialCredentials): Promise<string> {
  if (creds.refreshToken) {
    try {
      const r = await refreshGoogleAccessToken(creds.refreshToken);
      return r.accessToken;
    } catch {
      return creds.accessToken;
    }
  }
  return creds.accessToken;
}

type YtCommentSnippet = {
  textDisplay?: string;
  authorDisplayName?: string;
  publishedAt?: string;
  likeCount?: number;
  parentId?: string;
};

function mapYtComment(
  id: string,
  snippet: YtCommentSnippet | undefined,
  opts: { parentCommentId?: string; parentAuthor?: string; isReply: boolean }
): SocialComment {
  return {
    id,
    text: snippet?.textDisplay || '',
    author: snippet?.authorDisplayName || 'user',
    timestamp: snippet?.publishedAt,
    likeCount: snippet?.likeCount,
    platform: 'youtube',
    parentCommentId: opts.parentCommentId,
    parentAuthor: opts.parentAuthor,
    isReply: opts.isReply,
  };
}

/** Fetch all replies under a comment (thread), including nested replies */
async function fetchYouTubeCommentReplies(
  parentCommentId: string,
  token: string,
  parentAuthor: string
): Promise<SocialComment[]> {
  const out: SocialComment[] = [];
  let pageToken: string | undefined;

  do {
    const qs = new URLSearchParams({
      part: 'snippet',
      parentId: parentCommentId,
      maxResults: '100',
      textFormat: 'plainText',
    });
    if (pageToken) qs.set('pageToken', pageToken);

    const res = await ytGet<{
      items?: Array<{ id?: string; snippet?: YtCommentSnippet }>;
      nextPageToken?: string;
    }>(`/comments?${qs}`, token);

    for (const item of res.items || []) {
      if (!item.id) continue;
      out.push(
        mapYtComment(item.id, item.snippet, {
          parentCommentId,
          parentAuthor,
          isReply: true,
        })
      );
    }
    pageToken = res.nextPageToken;
  } while (pageToken && out.length < 200);

  return out;
}

export async function fetchYouTubeEngagement(
  videoId: string,
  creds: SocialCredentials
): Promise<PlatformEngagement> {
  const token = await resolveToken(creds);
  const metrics: PlatformEngagement['metrics'] = {};
  const comments: SocialComment[] = [];

  try {
    const stats = await ytGet<{
      items?: Array<{
        statistics?: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
        };
      }>;
    }>(`/videos?part=statistics&id=${videoId}`, token);

    const s = stats.items?.[0]?.statistics;
    metrics.views = s?.viewCount ? parseInt(s.viewCount, 10) : undefined;
    metrics.likes = s?.likeCount ? parseInt(s.likeCount, 10) : undefined;
    metrics.comments = s?.commentCount ? parseInt(s.commentCount, 10) : undefined;
  } catch (err) {
    return {
      platform: 'youtube',
      platformPostId: videoId,
      platformPostUrl: `https://www.youtube.com/watch?v=${videoId}`,
      metrics,
      comments,
      error: err instanceof Error ? err.message : 'Could not load YouTube stats',
    };
  }

  try {
    const threads = await ytGet<{
      items?: Array<{
        snippet?: {
          topLevelComment?: {
            id?: string;
            snippet?: YtCommentSnippet;
          };
        };
        replies?: {
          comments?: Array<{
            id?: string;
            snippet?: YtCommentSnippet;
          }>;
        };
      }>;
    }>(
      `/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=50&order=time`,
      token
    );

    for (const t of threads.items || []) {
      const top = t.snippet?.topLevelComment;
      if (!top?.id) continue;

      const topAuthor = top.snippet?.authorDisplayName || 'user';
      comments.push(
        mapYtComment(top.id, top.snippet, { isReply: false })
      );

      const inlineReplies = t.replies?.comments || [];
      const seenReplyIds = new Set<string>();

      for (const r of inlineReplies) {
        if (!r.id) continue;
        seenReplyIds.add(r.id);
        comments.push(
          mapYtComment(r.id, r.snippet, {
            parentCommentId: top.id,
            parentAuthor: topAuthor,
            isReply: true,
          })
        );
      }

      // Full thread via comments.list (catches replies not in inline bundle)
      try {
        const fullReplies = await fetchYouTubeCommentReplies(top.id, token, topAuthor);
        for (const r of fullReplies) {
          if (!seenReplyIds.has(r.id)) {
            comments.push(r);
            seenReplyIds.add(r.id);
          }
        }
      } catch {
        /* optional enrichment */
      }
    }
  } catch (err) {
    return {
      platform: 'youtube',
      platformPostId: videoId,
      platformPostUrl: `https://www.youtube.com/watch?v=${videoId}`,
      metrics,
      comments,
      error: err instanceof Error ? err.message : 'Could not load YouTube comments',
    };
  }

  return {
    platform: 'youtube',
    platformPostId: videoId,
    platformPostUrl: `https://www.youtube.com/watch?v=${videoId}`,
    metrics,
    comments,
  };
}

/** Reply under a specific comment (works for top-level and thread replies) */
export async function replyToYouTubeComment(
  parentCommentId: string,
  message: string,
  creds: SocialCredentials
): Promise<void> {
  const token = await resolveToken(creds);
  const res = await fetch(`${YT}/comments?part=snippet`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: {
        parentId: parentCommentId,
        textOriginal: message.slice(0, 10000),
      },
    }),
  });
  const data = (await res.json()) as { error?: { message?: string; errors?: Array<{ reason?: string }> } };
  if (!res.ok) {
    const reason = data.error?.errors?.[0]?.reason;
    if (reason === 'commentsDisabled') {
      throw new Error('Comments are disabled on this YouTube video');
    }
    if (reason === 'insufficientPermissions') {
      throw new Error('YouTube account missing comment permission — reconnect YouTube in Social settings');
    }
    throw new Error(data.error?.message || `YouTube reply failed (${res.status})`);
  }
}
