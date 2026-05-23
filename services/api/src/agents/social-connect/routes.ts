import { Router } from 'express';
import { db } from '../../lib/db';
import type { AuthRequest } from '../../middleware/auth';
import { buildOAuthUrl, assertPlatform } from './oauth';
import {
  getOAuthRedirectUri,
  getPlatformOAuthStatus,
  isPlatformOAuthReady,
  isTokenConnectPlatform,
  reloadApiEnv,
  type SocialPlatform,
} from './config';
import {
  sanitizeAccountForClient,
  connectWhatsAppAccount,
  saveSocialAccount,
} from './social-service';
import { getMetaOAuthPending, deleteMetaOAuthPending } from './meta-pending';
import { finalizeMetaPageSelection } from './providers/meta';
import {
  deleteGoogleOAuthPending,
  getGoogleOAuthPending,
} from './google-pending';
import { finalizeGoogleBusinessSelection } from './providers/google-business';
import {
  getWhatsAppEnvCredentials,
  isWhatsAppEnvConfigured,
} from './providers/whatsapp';
import {
  getWhatsAppVerifyToken,
  getWhatsAppWebhookUrl,
} from './config';
import { notifyOrderViaWhatsApp } from './whatsapp-notify';

export const socialRouter = Router();

socialRouter.get('/status', (_req, res) => {
  reloadApiEnv();
  res.json({ platforms: getPlatformOAuthStatus() });
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
    reloadApiEnv();
    const platform = assertPlatform(req.params.platform);

    if (!isPlatformOAuthReady(platform)) {
      return res.status(503).json({
        error: {
          message: `${platform} is not configured. Add the required credentials in services/api/.env`,
        },
      });
    }

    if (isTokenConnectPlatform(platform)) {
      return res.json({
        platform,
        mode: 'token',
        instructions:
          platform === 'whatsapp'
            ? 'Use a permanent token from Meta Business Suite → WhatsApp → API setup, plus your Phone Number ID.'
            : 'Use token connect for this platform.',
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

/** Meta: list pages after OAuth when multiple Pages exist. */
socialRouter.get('/meta/pending/:pendingId', async (req: AuthRequest, res, next) => {
  try {
    const pending = await getMetaOAuthPending(req.params.pendingId, req.user!.tenantId);
    if (!pending) {
      return res.status(404).json({ error: { message: 'Page selection session expired. Connect again.' } });
    }
    res.json({
      pendingId: pending.id,
      platform: pending.platform,
      pages: pending.pages.map((p) => ({
        id: p.id,
        name: p.name,
        hasInstagram: Boolean(p.instagram_business_account?.id),
        igUsername: p.instagram_business_account?.username,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** Meta: finish connect after user picks a Facebook Page / Instagram-linked Page. */
socialRouter.post('/meta/complete', async (req: AuthRequest, res, next) => {
  try {
    const { pendingId, pageId } = req.body as { pendingId?: string; pageId?: string };
    if (!pendingId?.trim() || !pageId?.trim()) {
      return res.status(400).json({ error: { message: 'pendingId and pageId are required' } });
    }

    const pending = await getMetaOAuthPending(pendingId.trim(), req.user!.tenantId);
    if (!pending) {
      return res.status(404).json({ error: { message: 'Page selection session expired. Connect again.' } });
    }

    const page = pending.pages.find((p) => p.id === pageId.trim());
    if (!page) {
      return res.status(400).json({ error: { message: 'Invalid page selection' } });
    }

    const input = finalizeMetaPageSelection(
      pending.platform,
      page,
      { tenantId: req.user!.tenantId, userId: req.user!.uid },
      pending.tokenExpiresAt
    );
    const account = await saveSocialAccount(input);
    await deleteMetaOAuthPending(pendingId.trim());

    res.status(201).json({
      account: sanitizeAccountForClient(account as Record<string, unknown>),
      message: `${pending.platform} connected`,
    });
  } catch (err) {
    next(err);
  }
});

/** Google Business: list accounts after OAuth when multiple profiles exist. */
socialRouter.get('/google-business/pending/:pendingId', async (req: AuthRequest, res, next) => {
  try {
    const pending = await getGoogleOAuthPending(req.params.pendingId, req.user!.tenantId);
    if (!pending) {
      return res.status(404).json({ error: { message: 'Account selection session expired. Connect again.' } });
    }
    res.json({
      pendingId: pending.id,
      platform: pending.platform,
      accounts: pending.accounts.map((a) => ({
        name: a.name,
        accountName: a.accountName,
        type: a.type,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** Google Business: finish connect after user picks a profile. */
socialRouter.post('/google-business/complete', async (req: AuthRequest, res, next) => {
  try {
    const { pendingId, accountName } = req.body as { pendingId?: string; accountName?: string };
    if (!pendingId?.trim() || !accountName?.trim()) {
      return res.status(400).json({ error: { message: 'pendingId and accountName are required' } });
    }

    const pending = await getGoogleOAuthPending(pendingId.trim(), req.user!.tenantId);
    if (!pending) {
      return res.status(404).json({ error: { message: 'Account selection session expired. Connect again.' } });
    }

    const input = finalizeGoogleBusinessSelection(pending, accountName.trim(), {
      tenantId: req.user!.tenantId,
      userId: req.user!.uid,
    });
    const account = await saveSocialAccount(input);
    await deleteGoogleOAuthPending(pendingId.trim());

    res.status(201).json({
      account: sanitizeAccountForClient(account as Record<string, unknown>),
      message: 'Google Business connected',
    });
  } catch (err) {
    next(err);
  }
});

/** WhatsApp setup: webhook URL, env readiness, Meta app hint. */
socialRouter.get('/whatsapp/setup', async (req: AuthRequest, res) => {
  reloadApiEnv();
  const tenant = await db.get('tenants', req.user!.tenantId);
  const envCreds = getWhatsAppEnvCredentials();
  res.json({
    webhookUrl: getWhatsAppWebhookUrl(),
    verifyToken: getWhatsAppVerifyToken(),
    metaAppId: process.env.META_APP_ID || null,
    envCredentialsReady: isWhatsAppEnvConfigured(),
    envHasNotifyPhone: Boolean(envCreds?.notifyPhone),
    whatsappNotifyPhone: (tenant?.whatsappNotifyPhone as string) || '',
    whatsappAlertsEnabled: tenant?.whatsappAlertsEnabled !== false,
    whatsappAutoReplyEnabled: tenant?.whatsappAutoReplyEnabled !== false,
    whatsappDefaultProductId: (tenant?.whatsappDefaultProductId as string) || '',
    whatsappPublishRecipients: (tenant?.whatsappPublishRecipients as string) || '',
    docs: {
      metaWhatsApp: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
      businessSuite: 'https://business.facebook.com/latest/whatsapp_manager',
    },
  });
});

/** Save seller alert phone + enable/disable order alerts. */
socialRouter.put('/whatsapp/settings', async (req: AuthRequest, res, next) => {
  try {
    const { notifyPhone, alertsEnabled, autoReplyEnabled, defaultProductId, publishRecipients } =
      req.body as {
      notifyPhone?: string;
      alertsEnabled?: boolean;
      autoReplyEnabled?: boolean;
      defaultProductId?: string;
      publishRecipients?: string;
    };
    const tenantId = req.user!.tenantId;
    const tenant = (await db.get('tenants', tenantId)) || { id: tenantId };
    const updates: Record<string, unknown> = {
      ...tenant,
      id: tenantId,
      updatedAt: new Date().toISOString(),
    };
    if (notifyPhone !== undefined) {
      updates.whatsappNotifyPhone = notifyPhone.trim();
    }
    if (alertsEnabled !== undefined) {
      updates.whatsappAlertsEnabled = alertsEnabled;
    }
    if (autoReplyEnabled !== undefined) {
      updates.whatsappAutoReplyEnabled = autoReplyEnabled;
    }
    if (defaultProductId !== undefined) {
      updates.whatsappDefaultProductId = defaultProductId.trim();
    }
    if (publishRecipients !== undefined) {
      updates.whatsappPublishRecipients = publishRecipients.trim();
    }
    await db.set('tenants', tenantId, updates);
    res.json({
      whatsappNotifyPhone: updates.whatsappNotifyPhone || '',
      whatsappAlertsEnabled: updates.whatsappAlertsEnabled !== false,
      whatsappAutoReplyEnabled: updates.whatsappAutoReplyEnabled !== false,
      whatsappDefaultProductId: updates.whatsappDefaultProductId || '',
      whatsappPublishRecipients: updates.whatsappPublishRecipients || '',
    });
  } catch (err) {
    next(err);
  }
});

/** Connect WhatsApp using WHATSAPP_* vars from services/api/.env */
socialRouter.post('/whatsapp/connect-env', async (req: AuthRequest, res, next) => {
  try {
    reloadApiEnv();
    const envCreds = getWhatsAppEnvCredentials();
    if (!envCreds) {
      return res.status(503).json({
        error: {
          message:
            'Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in services/api/.env, then restart the API.',
        },
      });
    }

    const account = await connectWhatsAppAccount(
      envCreds.accessToken,
      envCreds.phoneNumberId,
      envCreds.businessAccountId,
      { tenantId: req.user!.tenantId, userId: req.user!.uid }
    );

    if (envCreds.notifyPhone) {
      const tenant = (await db.get('tenants', req.user!.tenantId)) || { id: req.user!.tenantId };
      await db.set('tenants', req.user!.tenantId, {
        ...tenant,
        whatsappNotifyPhone: envCreds.notifyPhone,
        whatsappAlertsEnabled: true,
        updatedAt: new Date().toISOString(),
      });
    }

    res.status(201).json({
      account: sanitizeAccountForClient(account as Record<string, unknown>),
      message: 'WhatsApp connected from server environment',
    });
  } catch (err) {
    next(err);
  }
});

/** Send a test alert to the configured seller phone. */
socialRouter.post('/whatsapp/test', async (req: AuthRequest, res, next) => {
  try {
    const result = await notifyOrderViaWhatsApp(req.user!.tenantId, {
      orderNumber: 'TEST-0001',
      total: 1,
      customer: { name: 'Test Customer', phone: '+919999999999' },
    });
    if (!result.sent) {
      return res.status(400).json({ error: { message: result.error || 'Test failed' } });
    }
    res.json({ success: true, message: 'Test WhatsApp alert sent' });
  } catch (err) {
    next(err);
  }
});

/** WhatsApp Business Cloud API — permanent token + Phone Number ID. */
socialRouter.post('/connect/whatsapp', async (req: AuthRequest, res, next) => {
  try {
    const { accessToken, phoneNumberId, businessAccountId } = req.body as {
      accessToken?: string;
      phoneNumberId?: string;
      businessAccountId?: string;
    };

    if (!accessToken?.trim()) {
      return res.status(400).json({ error: { message: 'accessToken is required' } });
    }
    if (!phoneNumberId?.trim() && !businessAccountId?.trim()) {
      return res.status(400).json({
        error: { message: 'phoneNumberId or businessAccountId is required' },
      });
    }

    const account = await connectWhatsAppAccount(
      accessToken,
      phoneNumberId,
      businessAccountId,
      { tenantId: req.user!.tenantId, userId: req.user!.uid }
    );
    res.status(201).json({
      account: sanitizeAccountForClient(account as Record<string, unknown>),
      message: 'WhatsApp Business connected',
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
