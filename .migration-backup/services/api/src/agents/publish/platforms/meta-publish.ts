import { buildFacebookPostUrl, fetchInstagramPermalink } from '../platform-post-url';

const GRAPH = 'https://graph.facebook.com/v21.0';

export interface MetaPublishInput {
  caption: string;
  imageUrl: string;
  igBusinessAccountId: string;
  pageAccessToken: string;
}

export interface MetaPublishResult {
  platformPostId: string;
  platformPostUrl?: string;
}

/** Publish a single image post to Instagram Business via Graph API */
export async function publishToInstagram(input: MetaPublishInput): Promise<MetaPublishResult> {
  const createParams = new URLSearchParams({
    image_url: input.imageUrl,
    caption: input.caption.slice(0, 2200),
    access_token: input.pageAccessToken,
  });

  const createRes = await fetch(`${GRAPH}/${input.igBusinessAccountId}/media?${createParams}`, {
    method: 'POST',
  });
  const createData = (await createRes.json()) as { id?: string; error?: { message: string } };
  if (!createRes.ok || !createData.id) {
    throw new Error(createData.error?.message || 'Instagram media container failed');
  }

  const publishParams = new URLSearchParams({
    creation_id: createData.id,
    access_token: input.pageAccessToken,
  });
  const publishRes = await fetch(`${GRAPH}/${input.igBusinessAccountId}/media_publish?${publishParams}`, {
    method: 'POST',
  });
  const publishData = (await publishRes.json()) as { id?: string; error?: { message: string } };
  if (!publishRes.ok || !publishData.id) {
    throw new Error(publishData.error?.message || 'Instagram publish failed');
  }

  const platformPostUrl = await fetchInstagramPermalink(publishData.id, input.pageAccessToken);

  return { platformPostId: publishData.id, platformPostUrl };
}

export interface FacebookPublishInput {
  caption: string;
  imageUrl?: string;
  pageId: string;
  pageAccessToken: string;
}

export async function publishToFacebookPage(input: FacebookPublishInput): Promise<MetaPublishResult> {
  if (input.imageUrl) {
    const params = new URLSearchParams({
      url: input.imageUrl,
      caption: input.caption.slice(0, 63206),
      access_token: input.pageAccessToken,
    });
    const res = await fetch(`${GRAPH}/${input.pageId}/photos?${params}`, { method: 'POST' });
    const data = (await res.json()) as { id?: string; post_id?: string; error?: { message: string } };
    if (!res.ok) throw new Error(data.error?.message || 'Facebook photo post failed');
    const platformPostId = data.post_id || data.id || 'unknown';
    return {
      platformPostId,
      platformPostUrl: buildFacebookPostUrl(platformPostId, input.pageId),
    };
  }

  const params = new URLSearchParams({
    message: input.caption.slice(0, 63206),
    access_token: input.pageAccessToken,
  });
  const res = await fetch(`${GRAPH}/${input.pageId}/feed?${params}`, { method: 'POST' });
  const data = (await res.json()) as { id?: string; error?: { message: string } };
  if (!res.ok) throw new Error(data.error?.message || 'Facebook feed post failed');
  const platformPostId = data.id || 'unknown';
  return {
    platformPostId,
    platformPostUrl: buildFacebookPostUrl(platformPostId, input.pageId),
  };
}
