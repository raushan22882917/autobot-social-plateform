import type { SocialCredentials } from '../../social-connect/token-store';

const GRAPH = 'https://graph.facebook.com/v21.0';

export interface SocialComment {
  id: string;
  text: string;
  author: string;
  timestamp?: string;
  likeCount?: number;
  platform: string;
  /** Parent comment id when this is a thread reply */
  parentCommentId?: string;
  parentAuthor?: string;
  isReply?: boolean;
}

export interface PlatformEngagement {
  platform: string;
  platformPostId: string;
  platformPostUrl?: string;
  metrics: {
    likes?: number;
    comments?: number;
    views?: number;
    shares?: number;
    reach?: number;
  };
  comments: SocialComment[];
  error?: string;
}

async function graphGet<T>(path: string, accessToken: string): Promise<T> {
  const url = path.includes('?')
    ? `${GRAPH}${path}&access_token=${accessToken}`
    : `${GRAPH}${path}?access_token=${accessToken}`;
  const res = await fetch(url);
  const data = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok || (data as { error?: { message: string } }).error) {
    throw new Error((data as { error?: { message: string } }).error?.message || `Graph API error (${res.status})`);
  }
  return data;
}

export async function fetchInstagramEngagement(
  mediaId: string,
  creds: SocialCredentials
): Promise<PlatformEngagement> {
  const token = creds.accessToken;
  const metrics: PlatformEngagement['metrics'] = {};
  const comments: SocialComment[] = [];

  try {
    const insights = await graphGet<{
      data?: Array<{ name: string; values?: Array<{ value: number }> }>;
    }>(`/${mediaId}/insights?metric=likes,comments,reach,saved,shares`, token);

    for (const row of insights.data || []) {
      const val = row.values?.[0]?.value;
      if (row.name === 'likes') metrics.likes = val;
      if (row.name === 'comments') metrics.comments = val;
      if (row.name === 'reach') metrics.reach = val;
      if (row.name === 'shares') metrics.shares = val;
    }
  } catch {
    /* insights may require business account — continue with comments */
  }

  try {
    const commentRes = await graphGet<{
      data?: Array<{
        id: string;
        text?: string;
        username?: string;
        timestamp?: string;
        like_count?: number;
        replies?: {
          data?: Array<{
            id: string;
            text?: string;
            username?: string;
            timestamp?: string;
            like_count?: number;
          }>;
        };
      }>;
    }>(
      `/${mediaId}/comments?fields=id,text,username,timestamp,like_count,replies{id,text,username,timestamp,like_count}&limit=25`,
      token
    );

    for (const c of commentRes.data || []) {
      comments.push({
        id: c.id,
        text: c.text || '',
        author: c.username || 'user',
        timestamp: c.timestamp,
        likeCount: c.like_count,
        platform: 'instagram',
        isReply: false,
      });
      for (const r of c.replies?.data || []) {
        comments.push({
          id: r.id,
          text: r.text || '',
          author: r.username || 'user',
          timestamp: r.timestamp,
          likeCount: r.like_count,
          platform: 'instagram',
          parentCommentId: c.id,
          parentAuthor: c.username || 'user',
          isReply: true,
        });
      }
    }
    if (metrics.comments === undefined) metrics.comments = comments.length;
  } catch (err) {
    return {
      platform: 'instagram',
      platformPostId: mediaId,
      metrics,
      comments,
      error: err instanceof Error ? err.message : 'Could not load Instagram comments',
    };
  }

  return { platform: 'instagram', platformPostId: mediaId, metrics, comments };
}

export async function fetchFacebookEngagement(
  postId: string,
  creds: SocialCredentials
): Promise<PlatformEngagement> {
  const token = creds.accessToken;
  const comments: SocialComment[] = [];
  const metrics: PlatformEngagement['metrics'] = {};

  try {
    const post = await graphGet<{
      likes?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
      shares?: { count?: number };
    }>(`/${postId}?fields=likes.summary(true),comments.summary(true),shares`, token);

    metrics.likes = post.likes?.summary?.total_count;
    metrics.comments = post.comments?.summary?.total_count;
    metrics.shares = post.shares?.count;
  } catch {
    /* optional */
  }

  try {
    const commentRes = await graphGet<{
      data?: Array<{
        id: string;
        message?: string;
        from?: { name?: string };
        created_time?: string;
        like_count?: number;
        comments?: {
          data?: Array<{
            id: string;
            message?: string;
            from?: { name?: string };
            created_time?: string;
            like_count?: number;
          }>;
        };
      }>;
    }>(
      `/${postId}/comments?fields=id,message,from,created_time,like_count,comments{id,message,from,created_time,like_count}&limit=25`,
      token
    );

    for (const c of commentRes.data || []) {
      comments.push({
        id: c.id,
        text: c.message || '',
        author: c.from?.name || 'user',
        timestamp: c.created_time,
        likeCount: c.like_count,
        platform: 'facebook',
        isReply: false,
      });
      for (const r of c.comments?.data || []) {
        comments.push({
          id: r.id,
          text: r.message || '',
          author: r.from?.name || 'user',
          timestamp: r.created_time,
          likeCount: r.like_count,
          platform: 'facebook',
          parentCommentId: c.id,
          parentAuthor: c.from?.name || 'user',
          isReply: true,
        });
      }
    }
    if (metrics.comments === undefined) metrics.comments = comments.length;
  } catch (err) {
    return {
      platform: 'facebook',
      platformPostId: postId,
      metrics,
      comments,
      error: err instanceof Error ? err.message : 'Could not load Facebook comments',
    };
  }

  return { platform: 'facebook', platformPostId: postId, metrics, comments };
}

export async function replyToInstagramComment(
  commentId: string,
  message: string,
  accessToken: string
): Promise<void> {
  const params = new URLSearchParams({ message: message.slice(0, 2200), access_token: accessToken });
  const res = await fetch(`${GRAPH}/${commentId}/replies?${params}`, { method: 'POST' });
  const data = (await res.json()) as { error?: { message: string } };
  if (!res.ok) throw new Error(data.error?.message || 'Instagram reply failed');
}

export async function replyToFacebookComment(
  commentId: string,
  message: string,
  accessToken: string
): Promise<void> {
  const params = new URLSearchParams({ message: message.slice(0, 8000), access_token: accessToken });
  const res = await fetch(`${GRAPH}/${commentId}/comments?${params}`, { method: 'POST' });
  const data = (await res.json()) as { error?: { message: string } };
  if (!res.ok) throw new Error(data.error?.message || 'Facebook reply failed');
}
