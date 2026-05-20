import { Router } from 'express';
import { db } from '../../lib/db';
import type { AuthRequest } from '../../middleware/auth';
import { buildOAuthUrl, assertPlatform } from './oauth';
import {
  isPlatformOAuthReady,
  SOCIAL_PLATFORMS,
  getOAuthRedirectUri,
  type SocialPlatform,
} from './config';
import { sanitizeAccountForClient } from './social-service';

export const socialRouter = Router();

socialRouter.get('/status', (_req, res) => {
  const platforms = SOCIAL_PLATFORMS.reduce(
    (acc, p) => {
      const configured = isPlatformOAuthReady(p);
      acc[p] = {
        configured,
        canConnect: configured,
        redirectUri: getOAuthRedirectUri(p),
      };
      return acc;
    },
    {} as Record<SocialPlatform, { configured: boolean; canConnect: boolean; redirectUri: string }>
  );
  res.json({ platforms });
});

socialRouter.get('/accounts', async (req: AuthRequest, res, next) => {
  try {
    const accounts = await db.query('social_accounts', {
      filters: [{ field: 'tenantId', op: '==', value: req.user!.tenantId }],
    });
    const active = accounts.filter((a) => a.status === 'active');
    res.json({ accounts: active.map((a) => sanitizeAccountForClient(a as Record<string, unknown>)) });
  } catch (err) {
    next(err);
  }
});

socialRouter.get('/connect/:platform', (req: AuthRequest, res, next) => {
  try {
    const platform = assertPlatform(req.params.platform);

    if (!isPlatformOAuthReady(platform)) {
      return res.status(503).json({
        error: {
          message: `${platform} OAuth is not configured. Add the required credentials in services/api/.env`,
        },
      });
    }

    const { authUrl } = buildOAuthUrl(platform, {
      tenantId: req.user!.tenantId,
      userId: req.user!.uid,
    });
    res.json({
      authUrl,
      platform,
      mode: 'oauth',
      redirectUri: getOAuthRedirectUri(platform),
    });
  } catch (err) {
    next(err);
  }
});

socialRouter.delete('/accounts/:id', async (req: AuthRequest, res, next) => {
  try {
    const account = await db.get('social_accounts', req.params.id);
    if (!account || account.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Account not found' } });
    }
    const now = new Date().toISOString();
    await db.update('social_accounts', req.params.id, { status: 'revoked', updatedAt: now });
    await db.delete('social_tokens', req.params.id).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
