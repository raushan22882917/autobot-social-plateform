import { Router } from 'express';
import type { AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import {
  getN8nConnection,
  connectN8nForTenant,
  disconnectN8n,
  testN8nConnection,
} from './n8n-service';

export const orchestrationRouter = Router();

/** Get n8n connection status for current tenant (all roles can view) */
orchestrationRouter.get('/n8n', async (req: AuthRequest, res, next) => {
  try {
    const connection = await getN8nConnection(req.user!.tenantId);
    const platformUrl = process.env.N8N_BASE_URL || 'http://localhost:5678';

    res.json({
      connected: connection?.status === 'connected',
      connection: connection
        ? {
            status: connection.status,
            mode: connection.mode,
            n8nBaseUrl: connection.n8nBaseUrl,
            webhooksRegistered: connection.webhooksRegistered,
            lastTestedAt: connection.lastTestedAt,
            lastError: connection.lastError,
            connectedAt: connection.connectedAt,
            // Never expose full secret — show masked
            webhookSecretPreview: connection.webhookSecret
              ? `${connection.webhookSecret.slice(0, 8)}...`
              : null,
          }
        : null,
      platform: {
        n8nBaseUrl: platformUrl,
        requiredCredentials: [
          { key: 'webhookSecret', label: 'Webhook Secret', description: 'Auto-generated per your store for secure n8n callbacks' },
          { key: 'n8nBaseUrl', label: 'n8n URL (optional)', description: 'Use platform n8n or your own instance URL' },
          { key: 'n8nApiKey', label: 'n8n API Key (optional)', description: 'Only if using custom n8n for workflow management' },
        ],
      },
      user: {
        role: req.user!.role,
        tenantId: req.user!.tenantId,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Connect / auto-connect n8n for tenant (owner & admin only) */
orchestrationRouter.post('/n8n/connect', requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const { n8nBaseUrl, n8nApiKey, webhookSecret, mode } = req.body;

    const result = await connectN8nForTenant(req.user!.tenantId, {
      mode: mode || (n8nBaseUrl ? 'custom' : 'platform'),
      n8nBaseUrl,
      n8nApiKey,
      webhookSecret,
    });

    res.json({
      success: result.status === 'connected',
      message: result.testMessage,
      connection: {
        status: result.status,
        mode: result.mode,
        n8nBaseUrl: result.n8nBaseUrl,
        webhooksRegistered: result.webhooksRegistered,
        webhookSecretPreview: `${result.webhookSecret.slice(0, 8)}...`,
      },
      // Return secret once on connect so user can paste into n8n if needed
      webhookSecret: result.webhookSecret,
    });
  } catch (err) {
    next(err);
  }
});

/** Re-test existing connection */
orchestrationRouter.post('/n8n/test', requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const connection = await getN8nConnection(req.user!.tenantId);
    if (!connection) {
      return res.status(404).json({ error: { message: 'No n8n connection configured' } });
    }

    const test = await testN8nConnection(connection);
    res.json({ ok: test.ok, message: test.message });
  } catch (err) {
    next(err);
  }
});

/** Disconnect n8n */
orchestrationRouter.delete('/n8n', requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    await disconnectN8n(req.user!.tenantId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
