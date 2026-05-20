'use client';

import { useEffect, useState } from 'react';
import { Workflow, CheckCircle2, XCircle, Plug, Copy, Check } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { canManageN8n } from '@/lib/roles';

export function N8nConnectionCard() {
  const { token, user } = useAuth();
  const [status, setStatus] = useState<Awaited<ReturnType<typeof apiClient.getN8nStatus>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');

  const canManage = canManageN8n(user?.role);

  function load() {
    if (!token) return;
    apiClient.getN8nStatus(token).then(setStatus).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [token]);

  async function handleAutoConnect() {
    if (!token) return;
    setConnecting(true);
    setMessage('');
    try {
      const res = await apiClient.connectN8n(token, {
        n8nBaseUrl: customUrl || undefined,
        n8nApiKey: apiKey || undefined,
      });
      setWebhookSecret(res.webhookSecret || null);
      setMessage(res.message);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!token || !confirm('Disconnect n8n automation?')) return;
    await apiClient.disconnectN8n(token);
    setWebhookSecret(null);
    load();
  }

  function copySecret() {
    if (webhookSecret) {
      navigator.clipboard.writeText(webhookSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return <div className="glass-card h-48 animate-pulse" />;
  }

  const connected = status?.connected;

  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/30 to-red-500/30">
            <Workflow className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">n8n Automation</h2>
            <p className="text-sm text-muted-foreground">
              Role: <span className="capitalize text-violet-400">{user?.role || 'user'}</span>
              {' · '}Tenant: <span className="font-mono text-xs">{status?.user?.tenantId?.slice(0, 12)}...</span>
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
          {connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {connected ? 'Connected' : 'Not connected'}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Connect once — your store auto-routes posts, comments, payments & orders to n8n workflows using your unique webhook secret.
      </p>

      {!connected && canManage && (
        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-medium text-violet-300">Required credential (auto-generated on connect)</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• <strong>Webhook Secret</strong> — secures your store → n8n callbacks</li>
            <li>• <strong>n8n URL</strong> — optional (defaults to platform n8n)</li>
          </ul>

          <div>
            <Label className="text-xs">Custom n8n URL (optional)</Label>
            <Input
              placeholder={status?.platform?.n8nBaseUrl || 'http://localhost:5678'}
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">n8n API Key (optional)</Label>
            <Input
              type="password"
              placeholder="Only for self-hosted n8n"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button className="w-full" onClick={handleAutoConnect} loading={connecting}>
            <Plug className="h-4 w-4" />
            Connect n8n automatically
          </Button>
        </div>
      )}

      {connected && (
        <div className="mt-4 space-y-2 rounded-xl bg-emerald-500/10 p-4 text-sm">
          <p className="text-emerald-400">Automation active — events dispatch to n8n automatically</p>
          <p className="text-muted-foreground">URL: {status?.connection?.n8nBaseUrl}</p>
          <p className="text-muted-foreground">Secret: {status?.connection?.webhookSecretPreview}</p>
        </div>
      )}

      {webhookSecret && (
        <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
          <p className="text-xs font-medium text-violet-300">Your webhook secret (paste in n8n as X-Webhook-Secret header)</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-black/30 px-3 py-2 text-xs">{webhookSecret}</code>
            <Button size="sm" variant="secondary" onClick={copySecret}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Headers: <code>X-Webhook-Secret</code> + <code>X-Tenant-Id: {status?.user?.tenantId}</code>
          </p>
        </div>
      )}

      {message && (
        <p className={`mt-3 text-sm ${connected ? 'text-emerald-400' : 'text-amber-400'}`}>{message}</p>
      )}

      {connected && canManage && (
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleAutoConnect} loading={connecting}>
            Re-test connection
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      )}

      {!canManage && (
        <p className="mt-3 text-xs text-muted-foreground">Only store owner/admin can manage n8n connection.</p>
      )}
    </div>
  );
}

