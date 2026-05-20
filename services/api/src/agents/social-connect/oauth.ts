import {
  type SocialPlatform,
  SOCIAL_PLATFORMS,
  isPlatformOAuthReady,
} from './config';
import { signOAuthState } from './oauth-state';
import { buildMetaAuthUrl } from './providers/meta';
import { buildYouTubeAuthUrl } from './providers/google-youtube';
import { buildTikTokAuthUrl } from './providers/tiktok';
import { buildLinkedInAuthUrl } from './providers/linkedin';
import { completeMetaOAuth } from './providers/meta';
import { completeYouTubeOAuth } from './providers/google-youtube';
import { completeTikTokOAuth } from './providers/tiktok';
import { completeLinkedInOAuth } from './providers/linkedin';
import type { SaveSocialAccountInput } from './social-service';

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
  if (platform === 'linkedin') {
    return { authUrl: buildLinkedInAuthUrl(state), state };
  }
  return { authUrl: buildTikTokAuthUrl(state), state };
}

export async function completeOAuth(
  platform: SocialPlatform,
  code: string,
  ctx: { tenantId: string; userId: string }
): Promise<SaveSocialAccountInput> {
  if (platform === 'instagram' || platform === 'facebook') {
    return completeMetaOAuth(platform, code, ctx);
  }
  if (platform === 'youtube') {
    return completeYouTubeOAuth(code, ctx);
  }
  if (platform === 'linkedin') {
    return completeLinkedInOAuth(code, ctx);
  }
  return completeTikTokOAuth(code, ctx);
}
