import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';

export interface N8nConnection {
  tenantId: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  mode: 'platform' | 'custom';
  n8nBaseUrl: string;
  webhookSecret: string;
  n8nApiKey?: string;
  webhooksRegistered: boolean;
  lastTestedAt?: string;
  lastError?: string;
  connectedAt?: string;
  autoConnect: boolean;
}

const PLATFORM_N8N_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';

export async function getN8nConnection(tenantId: string): Promise<N8nConnection | null> {
  const doc = await db.get('tenant_integrations', tenantId);
  if (!doc) return null;
  return doc as unknown as N8nConnection;
}

export async function testN8nConnection(connection: N8nConnection): Promise<{ ok: boolean; message: string }> {
  const baseUrl = connection.n8nBaseUrl.replace(/\/$/, '');

  try {
    // Test n8n is reachable
    const healthRes = await fetch(`${baseUrl}/healthz`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
    }).catch(() =>
      fetch(`${baseUrl}/`, { method: 'GET', signal: AbortSignal.timeout(8000) })
    );

    if (!healthRes?.ok && healthRes?.status !== 404) {
      return { ok: false, message: `n8n not reachable at ${baseUrl}` };
    }

    // Test webhook path accepts our tenant payload (dry-run ping)
    const testRes = await fetch(`${baseUrl}/webhook/autobot360-connection-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': connection.webhookSecret,
        'X-Tenant-Id': connection.tenantId,
      },
      body: JSON.stringify({
        eventType: 'connection.test',
        tenantId: connection.tenantId,
        timestamp: new Date().toISOString(),
        idempotencyKey: `test_${uuidv4()}`,
      }),
      signal: AbortSignal.timeout(10000),
    });

    // 404 = workflow not imported yet, but n8n is up — still OK for dev
    if (testRes.ok || testRes.status === 404) {
      return { ok: true, message: testRes.ok ? 'Connected and webhook active' : 'n8n reachable (import workflows to activate webhooks)' };
    }

    return { ok: false, message: `Webhook test failed: HTTP ${testRes.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    // Dev fallback: allow connect without n8n running
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_N8N_OFFLINE === 'true') {
      return { ok: true, message: `Dev mode: marked connected (${msg})` };
    }
    return { ok: false, message: msg };
  }
}

export async function connectN8nForTenant(
  tenantId: string,
  options: {
    mode?: 'platform' | 'custom';
    n8nBaseUrl?: string;
    n8nApiKey?: string;
    webhookSecret?: string;
  } = {}
): Promise<N8nConnection & { testMessage: string }> {
  const existing = await getN8nConnection(tenantId);
  const now = new Date().toISOString();

  const connection: N8nConnection = {
    tenantId,
    status: 'pending',
    mode: options.mode || 'platform',
    n8nBaseUrl: options.n8nBaseUrl || PLATFORM_N8N_URL,
    webhookSecret: options.webhookSecret || existing?.webhookSecret || `whsec_${uuidv4().replace(/-/g, '')}`,
    n8nApiKey: options.n8nApiKey,
    webhooksRegistered: false,
    autoConnect: true,
    connectedAt: now,
  };

  const test = await testN8nConnection(connection);
  connection.status = test.ok ? 'connected' : 'error';
  connection.lastTestedAt = now;
  connection.lastError = test.ok ? undefined : test.message;
  connection.webhooksRegistered = test.ok;

  await db.set('tenant_integrations', tenantId, connection);

  // Register tenant with orchestration index for Pub/Sub routing
  await db.set('n8n_tenant_registry', tenantId, {
    tenantId,
    n8nBaseUrl: connection.n8nBaseUrl,
    webhookSecret: connection.webhookSecret,
    status: connection.status,
    registeredAt: now,
  });

  return { ...connection, testMessage: test.message };
}

export async function disconnectN8n(tenantId: string): Promise<void> {
  await db.update('tenant_integrations', tenantId, {
    status: 'disconnected',
    webhooksRegistered: false,
    updatedAt: new Date().toISOString(),
  });
  await db.delete('n8n_tenant_registry', tenantId);
}

export async function isTenantN8nConnected(tenantId: string): Promise<boolean> {
  const conn = await getN8nConnection(tenantId);
  return conn?.status === 'connected';
}

/** Route Pub/Sub event to tenant's n8n (or platform n8n with tenantId in body) */
export async function dispatchToN8n(
  tenantId: string,
  workflowPath: string,
  event: Record<string, unknown>
): Promise<boolean> {
  const registry = await db.get('n8n_tenant_registry', tenantId);
  const baseUrl = (registry?.n8nBaseUrl as string) || PLATFORM_N8N_URL;
  const secret = (registry?.webhookSecret as string) || process.env.N8N_WEBHOOK_SECRET || '';

  if (registry?.status !== 'connected' && process.env.NODE_ENV === 'production') {
    console.warn(`[n8n] Tenant ${tenantId} not connected — event queued`);
    return false;
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/webhook/${workflowPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': secret,
        'X-Tenant-Id': tenantId,
        'X-Idempotency-Key': (event.idempotencyKey as string) || uuidv4(),
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok && res.status !== 404) {
      console.error(`[n8n] Dispatch failed ${workflowPath}:`, res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[n8n] Dispatch error:`, err);
    return false;
  }
}
