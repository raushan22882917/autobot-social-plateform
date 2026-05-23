import { reloadApiEnv } from '../../lib/env';
import {
  type SocialPlatform,
  SOCIAL_PLATFORMS,
  isPlatformOAuthReady,
  isTokenConnectPlatform,
} from './config';
import { signOAuthState } from './oauth-state';
import { buildMetaAuthUrl } from './providers/meta';
import { buildYouTubeAuthUrl } from './providers/google-youtube';
import { buildGoogleBusinessAuthUrl } from './providers/google-business';
import { completeMetaOAuth } from './providers/meta';
import { completeYouTubeOAuth } from './providers/google-youtube';
import { completeGoogleBusinessOAuth } from './providers/google-business';

export function assertPlatform(platform: string): SocialPlatform {
  if (!SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return platform as SocialPlatform;
}

export function buildOAuthUrl(
  platform: SocialPlatform,
  ctx: { tenantId: string; userId: string }
): { authUrl: string; state: string } {
  reloadApiEnv();
  if (isTokenConnectPlatform(platform)) {
    throw new Error(`${platform} uses token connect — POST /api/v1/social/connect/${platform}`);
  }

  if (!isPlatformOAuthReady(platform)) {
    throw new Error(
      `${platform} OAuth is not configured. Add the required credentials in services/api/.env`
    );
  }

  const state = signOAuthState({ tenantId: ctx.tenantId, userId: ctx.userId, platform });

  if (platform === 'instagram' || platform === 'facebook') {
    return { authUrl: buildMetaAuthUrl(platform, state), state };
  }
  if (platform === 'youtube') {
    return { authUrl: buildYouTubeAuthUrl(state), state };
  }
  if (platform === 'google_business') {
    return { authUrl: buildGoogleBusinessAuthUrl(state), state };
  }
  throw new Error(`OAuth not supported for ${platform}`);
}

export async function completeOAuth(
  platform: SocialPlatform,
  code: string,
  ctx: { tenantId: string; userId: string }
) {
  if (platform === 'instagram' || platform === 'facebook') {
    return completeMetaOAuth(platform, code, ctx);
  }
  if (platform === 'youtube') {
    return completeYouTubeOAuth(code, ctx);
  }
  if (platform === 'google_business') {
    return completeGoogleBusinessOAuth(code, ctx);
  }
  throw new Error(`OAuth not supported for ${platform}`);
}
