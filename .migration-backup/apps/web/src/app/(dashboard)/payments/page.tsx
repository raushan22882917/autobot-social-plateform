'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Copy,
  Loader2,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader, EmptyState } from '@/components/data';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api';

interface Gateway {
  id: string;
  name: string;
  type: string;
  status: string;
  testMode: boolean;
  keyIdPreview?: string;
  webhookUrl?: string;
  createdAt?: string;
}

const AVAILABLE = [
  {
    type: 'razorpay' as const,
    name: 'Razorpay',
    description: "India's leading payment gateway — UPI, cards, netbanking, wallets.",
    icon: '🇮🇳',
  },
];

function PaymentsContent() {
  const { token } = useAuth();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    testMode: true,
  });

  const load = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    apiClient
      .getPaymentGateways(token)
      .then((r) => {
        setGateways(r.gateways || []);
        setConfigured(r.configured);
      })
      .catch((err) => {
        setGateways([]);
        setLoadError(err instanceof Error ? err.message : 'Failed to load gateways');
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await apiClient.savePaymentGateway(token, {
        type: 'razorpay',
        name: 'Razorpay',
        keyId: form.keyId.trim(),
        keySecret: form.keySecret.trim(),
        webhookSecret: form.webhookSecret.trim() || undefined,
        testMode: form.testMode,
      });
      setModalOpen(false);
      setForm({ keyId: '', keySecret: '', webhookSecret: '', testMode: true });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save gateway');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token || !confirm('Remove this payment gateway? Checkout will fall back to platform keys if configured.')) return;
    setDeletingId(id);
    try {
      await apiClient.deletePaymentGateway(token, id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  const webhookUrl =
    gateways.find((g) => g.webhookUrl)?.webhookUrl ||
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/payments/webhook`;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payments"
        description="Connect your own Razorpay account so customers pay you directly. Keys are encrypted and never shown again."
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Add gateway
          </Button>
        }
      />

      {configured && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
        >
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <motion.div>
            <p className="text-sm font-medium text-emerald-200">Payments ready</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Checkout and buy links from Product Analysis will use your connected gateway.
            </p>
          </motion.div>
        </motion.div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your gateways</h2>
        {loading ? (
          <div className="glass flex items-center justify-center gap-2 rounded-xl p-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{loadError}</div>
        ) : gateways.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-7 w-7 text-muted-foreground" />}
            title="No payment gateway"
            description="Add Razorpay keys to receive payments on your own account."
            action={{ label: 'Connect Razorpay', onClick: () => setModalOpen(true) }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {gateways.map((gw) => (
              <motion.div
                key={gw.id}
                layout
                className="glass rounded-xl border border-white/10 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <motion.div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20">
                      <CreditCard className="h-6 w-6 text-violet-400" />
                    </motion.div>
                    <div>
                      <p className="font-semibold">{gw.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">{gw.type}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      gw.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {gw.status}
                  </span>
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <motion.div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Key ID</dt>
                    <dd className="font-mono text-xs">{gw.keyIdPreview || '—'}</dd>
                  </motion.div>
                  <motion.div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Mode</dt>
                    <dd>{gw.testMode ? 'Test' : 'Live'}</dd>
                  </motion.div>
                  {gw.webhookUrl && (
                    <motion.div className="flex flex-col gap-1">
                      <dt className="text-muted-foreground">Webhook URL</dt>
                      <dd className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs">
                          {gw.webhookUrl}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyText(gw.webhookUrl!)}
                          className="rounded p-1 hover:bg-white/10"
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </dd>
                    </motion.div>
                  )}
                </dl>

                <div className="mt-4 flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={deletingId === gw.id}
                    onClick={() => handleDelete(gw.id)}
                  >
                    {deletingId === gw.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Remove
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Available integrations</h2>
        <motion.div className="grid gap-4 md:grid-cols-2">
          {AVAILABLE.map((g) => (
            <motion.div key={g.type} className="glass rounded-xl border border-white/10 p-5">
              <span className="text-3xl">{g.icon}</span>
              <h3 className="mt-3 font-semibold">{g.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
              <Button className="mt-4 w-full" variant="primary" onClick={() => setModalOpen(true)}>
                Connect {g.name}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <motion.div className="glass rounded-xl border border-white/10 p-6">
        <h3 className="flex items-center gap-2 font-semibold">
          <Shield className="h-5 w-5 text-violet-400" />
          Setup guide
        </h3>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Open Razorpay Dashboard → Settings → API Keys.</li>
          <li>Copy Key ID and Key Secret (use test keys while testing).</li>
          <li>Paste them here and save.</li>
          <li>
            In Razorpay, set webhook URL to:{' '}
            <code className="rounded bg-black/30 px-1 text-xs">{webhookUrl}</code>
            <button
              type="button"
              className="ml-2 inline align-middle text-violet-400 hover:text-violet-300"
              onClick={() => copyText(webhookUrl)}
            >
              Copy
            </button>
          </li>
        </ol>
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
          <p className="text-sm text-muted-foreground">
            API secrets are encrypted at rest. We only show a masked key preview after setup.
          </p>
        </div>
      </motion.div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Connect Razorpay" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="keyId">Key ID</Label>
            <Input
              id="keyId"
              placeholder="rzp_test_… or rzp_live_…"
              value={form.keyId}
              onChange={(e) => setForm((f) => ({ ...f, keyId: e.target.value }))}
              required
            />
          </div>
          <motion.div>
            <Label htmlFor="keySecret">Key Secret</Label>
            <Input
              id="keySecret"
              type="password"
              placeholder="Your Razorpay secret"
              value={form.keySecret}
              onChange={(e) => setForm((f) => ({ ...f, keySecret: e.target.value }))}
              required
            />
          </motion.div>
          <motion.div>
            <Label htmlFor="webhookSecret">Webhook secret (optional)</Label>
            <Input
              id="webhookSecret"
              type="password"
              placeholder="From Razorpay webhook settings"
              value={form.webhookSecret}
              onChange={(e) => setForm((f) => ({ ...f, webhookSecret: e.target.value }))}
            />
          </motion.div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.testMode}
              onChange={(e) => setForm((f) => ({ ...f, testMode: e.target.checked }))}
              className="rounded"
            />
            Test mode (use test API keys)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save gateway'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<motion.div className="glass h-48 animate-pulse rounded-xl" />}>
      <PaymentsContent />
    </Suspense>
  );
}
