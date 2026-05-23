import { envValue, hasEnv, reloadApiEnv } from '../../lib/env';
import { isWhatsAppEnvConfigured } from './providers/whatsapp';

export { reloadApiEnv };

export const SOCIAL_PLATFORMS = [
  'instagram',
  'facebook',
  'whatsapp',
  'youtube',
  'google_business',
] as const;

/** Platforms that use token / manual connect instead of OAuth redirect */
export const TOKEN_CONNECT_PLATFORMS = ['whatsapp'] as const;
export type TokenConnectPlatform = (typeof TOKEN_CONNECT_PLATFORMS)[number];

export function isTokenConnectPlatform(platform: SocialPlatform): platform is TokenConnectPlatform {
  return (TOKEN_CONNECT_PLATFORMS as readonly string[]).includes(platform);
}
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
  return (
    hasEnv('META_APP_ID', 'FACEBOOK_APP_ID', 'INSTAGRAM_APP_ID') &&
    hasEnv('META_APP_SECRET', 'FACEBOOK_APP_SECRET', 'INSTAGRAM_APP_SECRET')
  );
}

export function isGoogleConfigured(): boolean {
  return (
    hasEnv('GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_CLIENT_ID', 'YOUTUBE_CLIENT_ID') &&
    hasEnv('GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET', 'YOUTUBE_CLIENT_SECRET')
  );
}

export function isWhatsAppConnectEnabled(): boolean {
  return envValue('WHATSAPP_CONNECT_DISABLED') !== 'true';
}

/** Manual connect UI + token modal always available unless disabled. */
export function isWhatsAppConfigured(): boolean {
  return isWhatsAppConnectEnabled();
}

export function getWhatsAppWebhookUrl(): string {
  return `${getApiBaseUrl()}/api/v1/webhooks/whatsapp`;
}

export function getWhatsAppVerifyToken(): string {
  return envValue('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'META_WEBHOOK_VERIFY_TOKEN') || 'autobot360';
}

/** Env var names shown in the UI when a platform is not configured */
export function getPlatformEnvHints(platform: SocialPlatform): string[] {
  switch (platform) {
    case 'instagram':
    case 'facebook':
      return ['META_APP_ID', 'META_APP_SECRET'];
    case 'youtube':
    case 'google_business':
      return ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'];
    case 'whatsapp':
      return ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID (or connect in UI)'];
    default:
      return [];
  }
}

/** Refresh .env from disk then evaluate readiness (used by /social/status). */
export function getPlatformOAuthStatus(): Record<
  SocialPlatform,
  { configured: boolean; canConnect: boolean; redirectUri: string; envKeys?: string[] }
> {
  reloadApiEnv();
  return SOCIAL_PLATFORMS.reduce(
    (acc, p) => {
      const configured = isPlatformOAuthReady(p);
      const base = {
        configured: p === 'whatsapp' ? configured || isWhatsAppEnvConfigured() : configured,
        canConnect: configured,
        redirectUri: isTokenConnectPlatform(p) ? '' : getOAuthRedirectUri(p),
        envKeys: configured ? undefined : getPlatformEnvHints(p),
      };
      if (p === 'whatsapp') {
        acc[p] = {
          ...base,
          canConnect: isWhatsAppConnectEnabled(),
          webhookUrl: getWhatsAppWebhookUrl(),
          verifyToken: getWhatsAppVerifyToken(),
          envCredentialsReady: isWhatsAppEnvConfigured(),
          metaAppId: envValue('META_APP_ID', 'FACEBOOK_APP_ID'),
        };
      } else {
        acc[p] = base;
      }
      return acc;
    },
    {} as Record<
      SocialPlatform,
      { configured: boolean; canConnect: boolean; redirectUri: string; envKeys?: string[] }
    >
  );
}

export function isPlatformOAuthReady(platform: SocialPlatform): boolean {
  if (platform === 'whatsapp') return isWhatsAppConfigured();
  if (platform === 'instagram' || platform === 'facebook') return isMetaConfigured();
  if (platform === 'youtube' || platform === 'google_business') return isGoogleConfigured();
  return false;
}
