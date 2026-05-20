const UPLOAD_INIT = 'https://www.googleapis.com/upload/youtube/v3/videos';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB safety cap for API server

export interface YouTubePublishInput {
  accessToken: string;
  refreshToken?: string;
  accountId?: string;
  title: string;
  description: string;
  videoUrl: string;
  privacyStatus?: 'public' | 'unlisted' | 'private';
}

export interface YouTubePublishResult {
  platformPostId: string;
  platformPostUrl?: string;
  videoUrl?: string;
  privacyStatus?: 'public' | 'unlisted' | 'private';
}

function getGoogleClientCreds() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth not configured (GOOGLE_OAUTH_CLIENT_ID / SECRET)');
  }
  return { clientId, clientSecret };
}

/** Refresh Google access token and optionally persist via callback */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const { clientId, clientSecret } = getGoogleClientCreds();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token refresh failed');
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in || 3600 };
}

async function resolveAccessToken(input: YouTubePublishInput): Promise<string> {
  if (!input.refreshToken) return input.accessToken;
  try {
    const refreshed = await refreshGoogleAccessToken(input.refreshToken);
    return refreshed.accessToken;
  } catch {
    return input.accessToken;
  }
}

async function loadVideoBytes(videoUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (videoUrl.startsWith('data:')) {
    const match = videoUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid video data URL');
    const mimeType = match[1] || 'video/mp4';
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_BYTES) {
      throw new Error(`Video too large (${Math.round(buffer.length / 1024 / 1024)}MB). Max ${MAX_BYTES / 1024 / 1024}MB for upload.`);
    }
    if (buffer.length < 1024) throw new Error('Video file is too small or empty');
    return { buffer, mimeType };
  }

  if (!/^https?:\/\//i.test(videoUrl)) {
    throw new Error('YouTube requires a public https video URL or an uploaded video file from Studio');
  }

  const res = await fetch(videoUrl, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`Could not download video (${res.status})`);
  const mimeType = res.headers.get('content-type') || 'video/mp4';
  if (!mimeType.startsWith('video/')) {
    throw new Error('URL is not a video file. Add a .mp4 video in Studio or use a direct video URL.');
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > MAX_BYTES) {
    throw new Error(`Video too large (${Math.round(buffer.length / 1024 / 1024)}MB). Max ${MAX_BYTES / 1024 / 1024}MB.`);
  }
  if (buffer.length < 1024) throw new Error('Downloaded video is empty or too small');
  return { buffer, mimeType };
}

/** Resumable upload — YouTube Data API v3 */
export async function publishToYouTube(input: YouTubePublishInput): Promise<YouTubePublishResult> {
  const accessToken = await resolveAccessToken(input);
  const { buffer, mimeType } = await loadVideoBytes(input.videoUrl);

  const privacyStatus =
    input.privacyStatus ||
    (process.env.YOUTUBE_DEFAULT_PRIVACY as 'public' | 'unlisted' | 'private') ||
    'unlisted';

  const metadata = {
    snippet: {
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 5000),
      categoryId: '22', // People & Blogs — generic default
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };

  const initRes = await fetch(
    `${UPLOAD_INIT}?uploadType=resumable&part=snippet,status`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(buffer.length),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initRes.ok) {
    const err = (await initRes.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || `YouTube upload init failed (${initRes.status})`);
  }

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube did not return an upload URL');

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(buffer.length),
    },
    body: buffer,
  });

  const uploadData = (await uploadRes.json()) as {
    id?: string;
    snippet?: { title?: string };
    error?: { message?: string };
  };

  if (!uploadRes.ok || !uploadData.id) {
    throw new Error(uploadData.error?.message || `YouTube upload failed (${uploadRes.status})`);
  }

  const platformPostUrl = `https://www.youtube.com/watch?v=${uploadData.id}`;
  return {
    platformPostId: uploadData.id,
    platformPostUrl,
    videoUrl: platformPostUrl,
    privacyStatus,
  };
}

const VIDEOS_API = 'https://www.googleapis.com/youtube/v3/videos';

/** Update visibility on an already-uploaded YouTube video */
export async function updateYouTubeVideoPrivacy(input: {
  videoId: string;
  accessToken: string;
  refreshToken?: string;
  privacyStatus: 'public' | 'unlisted' | 'private';
}): Promise<void> {
  const accessToken = await resolveAccessToken({
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    title: '',
    description: '',
    videoUrl: '',
  });

  const res = await fetch(`${VIDEOS_API}?part=status`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: input.videoId,
      status: { privacyStatus: input.privacyStatus },
    }),
  });

  const data = (await res.json()) as { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message || `YouTube privacy update failed (${res.status})`);
  }
}
