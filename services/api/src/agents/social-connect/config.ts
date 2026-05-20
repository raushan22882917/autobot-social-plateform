export const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'youtube', 'tiktok'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export function getApiBaseUrl(): string {
  return (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 8081}`).replace(/\/$/, '');
}

export function getWebAppUrl(): string {
  return (process.env.PUBLIC_URL || 'http://localhost:3001').replace(/\/$/, '');
}

export function getOAuthRedirectUri(platform: SocialPlatform): string {
  return `${getApiBaseUrl()}/api/v1/social/oauth/callback/${platform}`;
}

export function isMetaConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function isTikTokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

export function isPlatformOAuthReady(platform: SocialPlatform): boolean {
  if (platform === 'instagram' || platform === 'facebook') return isMetaConfigured();
  if (platform === 'youtube') return isGoogleConfigured();
  if (platform === 'tiktok') return isTikTokConfigured();
  return false;
}
