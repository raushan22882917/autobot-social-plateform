import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
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
      acc[p] = {
        configured: isPlatformOAuthReady(p),
        redirectUri: getOAuthRedirectUri(p),
      };
      return acc;
    },
    {} as Record<SocialPlatform, { configured: boolean; redirectUri: string }>
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
    const { authUrl, state } = buildOAuthUrl(platform, {
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

/** Dev-only fallback when OAuth credentials are missing */
socialRouter.post('/connect/:platform/simulate', async (req: AuthRequest, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: { message: 'Simulate is disabled in production' } });
    }
    const platform = req.params.platform;
    assertPlatform(platform);
    const id = `sa_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const account = {
      id,
      tenantId: req.user!.tenantId,
      platform,
      platformUserId: `platform_${uuidv4().slice(0, 6)}`,
      username: `${platform}_user_${Date.now().toString(36)}`,
      displayName: `My ${platform} account`,
      profilePictureUrl: '',
      secretRef: `dev-secret-${id}`,
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600000).toISOString(),
      scopes: ['publish', 'read'],
      status: 'active',
      lastValidatedAt: now,
      connectedAt: now,
      connectedBy: req.user!.uid,
    };
    await db.set('social_accounts', id, account);
    res.status(201).json({ account: sanitizeAccountForClient(account) });
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
