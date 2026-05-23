'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Instagram, Facebook, Youtube, Link2, Unlink, AlertCircle, CheckCircle2, Settings2 } from 'lucide-react';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.869 1.171l-.346.217-3.597-.094 1.447 3.828.6.092c1.644.007 3.203.635 4.382 1.77 1.18 1.136 1.844 2.652 1.844 4.248 0 .975-.186 1.923-.537 2.82l-.088.345 3.601.545.092-.003a9.936 9.936 0 001.449-19.726z" />
    </svg>
  );
}

function GoogleBusinessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-2 18h-2v-8h2v8zm-1-9.225c-.621 0-1.125-.504-1.125-1.125s.504-1.125 1.125-1.125 1.125.504 1.125 1.125-.504 1.125-1.125 1.125zm8.225 9.225h-2v-4c0-.955-.017-2.184-1.33-2.184-1.33 0-1.533 1.04-1.533 2.113v4.071h-2v-8h1.92v1.094h.028c.268-.507.922-1.04 1.897-1.04 2.025 0 2.4 1.333 2.4 3.07v4.876z" />
    </svg>
  );
}

import { useAuth } from '@/hooks/use-auth';
import { apiClient, ApiError, type Product, type SocialAccount } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader, DataToolbar, DataTable, StatusBadge, type Column } from '@/components/data';
import { useListControls } from '@/hooks/use-list-controls';

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-[#833AB4] via-[#E4405F] to-[#F77737]' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'from-[#1877F2] to-[#0d65d9]' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'from-[#FF0000] to-[#CC0000]' },
  { id: 'google_business', name: 'Google Business', icon: GoogleBusinessIcon, color: 'from-[#4285F4] via-[#EA4335] to-[#34A853]' },
  { id: 'whatsapp', name: 'WhatsApp', icon: WhatsAppIcon, color: 'from-[#25D366] to-[#128C7E]' },
] as const;

type PlatformId = (typeof PLATFORMS)[number]['id'];

function SocialContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [platformStatus, setPlatformStatus] = useState<
    Record<string, { configured?: boolean; canConnect?: boolean; envKeys?: string[] }>
  >({});
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappSettingsOpen, setWhatsappSettingsOpen] = useState(false);
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappBusinessId, setWhatsappBusinessId] = useState('');

  const [waNotifyPhone, setWaNotifyPhone] = useState('');
  const [waAlertsEnabled, setWaAlertsEnabled] = useState(true);
  const [waAutoReplyEnabled, setWaAutoReplyEnabled] = useState(true);
  const [waDefaultProductId, setWaDefaultProductId] = useState('');
  const [waPublishRecipients, setWaPublishRecipients] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [waSaving, setWaSaving] = useState(false);

  const [metaPendingId, setMetaPendingId] = useState<string | null>(null);
  const [metaPendingPlatform, setMetaPendingPlatform] = useState<string | null>(null);
  const [metaPages, setMetaPages] = useState<
    { id: string; name: string; hasInstagram: boolean; igUsername?: string }[]
  >([]);
  const [metaPagesLoading, setMetaPagesLoading] = useState(false);

  const [googlePendingId, setGooglePendingId] = useState<string | null>(null);
  const [googleAccounts, setGoogleAccounts] = useState<
    { name: string; accountName: string; type?: string }[]
  >([]);
  const [googleAccountsLoading, setGoogleAccountsLoading] = useState(false);

  const accountList = useListControls({
    items: accounts,
    searchKeys: ['platform', 'username', 'displayName'],
    filterFn: (a, f) => (f.platform === 'all' ? true : a.platform === f.platform),
    sortKeys: {
      platform: (a, b) => a.platform.localeCompare(b.platform),
      username: (a, b) => a.username.localeCompare(b.username),
    },
    defaultSortKey: 'platform',
    pageSize: 10,
  });

  const loadWhatsAppSetup = useCallback(() => {
    if (!token) return;
    apiClient
      .getWhatsAppSetup(token)
      .then((s) => {
        setWaNotifyPhone(s.whatsappNotifyPhone || '');
        setWaAlertsEnabled(s.whatsappAlertsEnabled);
        setWaAutoReplyEnabled(s.whatsappAutoReplyEnabled);
        setWaDefaultProductId(s.whatsappDefaultProductId || '');
        setWaPublishRecipients(s.whatsappPublishRecipients || '');
      })
      .catch(() => {});
  }, [token]);

  const loadStatus = useCallback(() => {
    if (!token) {
      setStatusLoading(false);
      return;
    }
    setStatusLoading(true);
    apiClient
      .getSocialStatus(token)
      .then((r) => {
        setPlatformStatus(r.platforms);
        setStatusError(null);
      })
      .catch((err) => {
        setStatusError(err instanceof ApiError ? err.message : 'API unavailable');
      })
      .finally(() => setStatusLoading(false));
  }, [token]);

  const load = useCallback(() => {
    if (!token) return;
    apiClient.getSocialAccounts(token).then((r) => setAccounts(r.accounts as SocialAccount[]));
    apiClient.getProducts(token).then((r) => setProducts(r.products || [])).catch(() => {});
    loadStatus();
    loadWhatsAppSetup();
  }, [token, loadStatus, loadWhatsAppSetup]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => loadStatus();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadStatus]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    const metaPending = searchParams.get('metaPending');
    const googlePending = searchParams.get('googlePending');
    const platform = searchParams.get('platform');

    if (metaPending && platform && token) {
      setMetaPendingId(metaPending);
      setMetaPendingPlatform(platform);
      setMetaPagesLoading(true);
      apiClient
        .getMetaPendingPages(token, metaPending)
        .then((r) => setMetaPages(r.pages))
        .catch((err) => {
          setBanner({ type: 'error', message: err instanceof ApiError ? err.message : 'Session expired' });
        })
        .finally(() => setMetaPagesLoading(false));
      window.history.replaceState({}, '', '/social');
    } else if (googlePending && token) {
      setGooglePendingId(googlePending);
      setGoogleAccountsLoading(true);
      apiClient
        .getGoogleBusinessPendingAccounts(token, googlePending)
        .then((r) => setGoogleAccounts(r.accounts))
        .catch((err) => {
          setBanner({ type: 'error', message: err instanceof ApiError ? err.message : 'Session expired' });
        })
        .finally(() => setGoogleAccountsLoading(false));
      window.history.replaceState({}, '', '/social');
    } else if (connected) {
      setBanner({ type: 'success', message: `${connected} connected` });
      load();
      window.history.replaceState({}, '', '/social');
    } else if (error) {
      const decoded = decodeURIComponent(error);
      const isQuota = /quota exceeded|requests per minute/i.test(decoded);
      const friendly = isQuota
        ? 'Google Business rate limit — wait 2–3 minutes, then click Connect once. Avoid retrying quickly.'
        : decoded;
      if (isQuota) {
        sessionStorage.setItem('google_business_connect_until', String(Date.now() + 120_000));
      }
      setBanner({ type: 'error', message: friendly });
      window.history.replaceState({}, '', '/social');
    }
  }, [searchParams, load, token]);

  async function connect(platform: PlatformId) {
    if (!token) return;

    if (platform === 'whatsapp') {
      setWhatsappOpen(true);
      return;
    }

    if (platform === 'google_business') {
      const cooldownKey = 'google_business_connect_until';
      const until = Number(sessionStorage.getItem(cooldownKey) || 0);
      if (until > Date.now()) {
        const secs = Math.ceil((until - Date.now()) / 1000);
        setBanner({
          type: 'error',
          message: `Please wait ${secs}s before connecting Google Business again (API rate limit).`,
        });
        return;
      }
    }

    setConnecting(platform);
    setBanner(null);
    try {
      const { authUrl, mode } = await apiClient.getSocialConnectUrl(token, platform);
      if (mode === 'oauth' && authUrl) {
        if (platform === 'google_business') {
          sessionStorage.setItem('google_business_connect_until', String(Date.now() + 60_000));
        }
        window.location.href = authUrl;
        return;
      }
      throw new Error('Not configured');
    } catch (err) {
      setBanner({ type: 'error', message: err instanceof ApiError ? err.message : 'Connect failed' });
      setConnecting(null);
    }
  }

  async function submitWhatsAppConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setConnecting('whatsapp');
    try {
      await apiClient.connectWhatsApp(token, {
        accessToken: whatsappToken.trim(),
        phoneNumberId: whatsappPhoneId.trim(),
        businessAccountId: whatsappBusinessId.trim() || undefined,
      });
      setWhatsappOpen(false);
      setBanner({ type: 'success', message: 'WhatsApp connected' });
      load();
    } catch (err) {
      setBanner({ type: 'error', message: err instanceof ApiError ? err.message : 'Failed' });
    } finally {
      setConnecting(null);
    }
  }

  async function saveWhatsAppSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setWaSaving(true);
    try {
      await apiClient.updateWhatsAppSettings(token, {
        notifyPhone: waNotifyPhone,
        alertsEnabled: waAlertsEnabled,
        autoReplyEnabled: waAutoReplyEnabled,
        defaultProductId: waDefaultProductId,
        publishRecipients: waPublishRecipients,
      });
      setWhatsappSettingsOpen(false);
      setBanner({ type: 'success', message: 'Saved' });
    } catch (err) {
      setBanner({ type: 'error', message: err instanceof ApiError ? err.message : 'Failed' });
    } finally {
      setWaSaving(false);
    }
  }

  async function completeMetaPage(pageId: string) {
    if (!token || !metaPendingId) return;
    setConnecting(metaPendingPlatform || 'meta');
    try {
      await apiClient.completeMetaPageSelection(token, { pendingId: metaPendingId, pageId });
      setMetaPendingId(null);
      setMetaPages([]);
      setBanner({ type: 'success', message: 'Connected' });
      load();
    } catch (err) {
      setBanner({ type: 'error', message: err instanceof ApiError ? err.message : 'Failed' });
    } finally {
      setConnecting(null);
    }
  }

  async function completeGoogleBusinessAccount(accountName: string) {
    if (!token || !googlePendingId) return;
    setConnecting('google_business');
    try {
      await apiClient.completeGoogleBusinessSelection(token, { pendingId: googlePendingId, accountName });
      setGooglePendingId(null);
      setGoogleAccounts([]);
      setBanner({ type: 'success', message: 'Connected' });
      load();
    } catch (err) {
      setBanner({ type: 'error', message: err instanceof ApiError ? err.message : 'Failed' });
    } finally {
      setConnecting(null);
    }
  }

  async function disconnect(id: string) {
    if (!token) return;
    await apiClient.disconnectSocial(token, id);
    load();
  }

  function openWhatsAppSettings() {
    loadWhatsAppSetup();
    setWhatsappSettingsOpen(true);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Social"
        actions={
          <Button variant="ghost" size="sm" onClick={() => loadStatus()} disabled={statusLoading}>
            Refresh
          </Button>
        }
      />

      {statusError && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {statusError}
        </div>
      )}

      {banner && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/30 bg-red-500/10 text-red-200'
          }`}
        >
          {banner.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {banner.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const connected = accounts.find((a) => a.platform === platform.id && a.status === 'active');
          const status = platformStatus[platform.id];
          const ready = status?.canConnect === true || status?.configured === true;
          const Icon = platform.icon;

          return (
            <div key={platform.id} className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${platform.color}`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{platform.name}</h3>
                  {connected ? (
                    <p className="truncate text-sm text-brand-whatsapp">@{connected.username}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{ready ? 'Not connected' : 'Setup required'}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {connected ? (
                  <>
                    {platform.id === 'whatsapp' && (
                      <Button variant="ghost" size="sm" onClick={openWhatsAppSettings}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => disconnect(connected.id)}>
                      <Unlink className="h-4 w-4" /> Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={connecting === platform.id}
                    disabled={statusLoading || !ready}
                    onClick={() => void connect(platform.id)}
                  >
                    <Link2 className="h-4 w-4" /> Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {accounts.length > 0 && (
        <>
          <DataToolbar
            search={accountList.search}
            onSearchChange={accountList.setSearch}
            searchPlaceholder="Search…"
            filters={[
              {
                key: 'platform',
                label: 'Platform',
                options: [
                  { value: 'all', label: 'All' },
                  ...PLATFORMS.map((p) => ({ value: p.id, label: p.name })),
                ],
              },
            ]}
            filterValues={accountList.filters}
            onFilterChange={accountList.setFilter}
            onReset={accountList.reset}
            totalCount={accountList.totalCount}
            page={accountList.page}
            totalPages={accountList.totalPages}
            onPageChange={accountList.setPage}
          />
          <DataTable
            columns={
              [
                {
                  key: 'platform',
                  header: 'Platform',
                  sortable: true,
                  cell: (a) => <span className="capitalize">{a.platform}</span>,
                },
                {
                  key: 'username',
                  header: 'Account',
                  sortable: true,
                  cell: (a) => <span>@{a.username}</span>,
                },
                { key: 'status', header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
                {
                  key: 'actions',
                  header: '',
                  className: 'text-right',
                  cell: (a) => (
                    <Button variant="ghost" size="sm" onClick={() => disconnect(a.id)}>
                      Disconnect
                    </Button>
                  ),
                },
              ] as Column<SocialAccount>[]
            }
            data={accountList.paginated}
            sortKey={accountList.sortKey}
            sortDir={accountList.sortDir}
            onSort={accountList.toggleSort}
            rowKey={(a) => a.id}
            emptyMessage="No matches"
          />
        </>
      )}

      <Modal open={whatsappOpen} onClose={() => setWhatsappOpen(false)} title="Connect WhatsApp">
        <form onSubmit={(e) => void submitWhatsAppConnect(e)} className="space-y-4">
          <div>
            <Label htmlFor="wa-token">Access token</Label>
            <Input
              id="wa-token"
              type="password"
              value={whatsappToken}
              onChange={(e) => setWhatsappToken(e.target.value)}
              className="mt-1 font-mono text-sm"
              required
            />
          </div>
          <div>
            <Label htmlFor="wa-phone-id">Phone number ID</Label>
            <Input
              id="wa-phone-id"
              value={whatsappPhoneId}
              onChange={(e) => setWhatsappPhoneId(e.target.value)}
              className="mt-1 font-mono text-sm"
              required
            />
          </div>
          <Button type="submit" className="w-full" loading={connecting === 'whatsapp'}>
            Connect
          </Button>
        </form>
      </Modal>

      <Modal open={whatsappSettingsOpen} onClose={() => setWhatsappSettingsOpen(false)} title="WhatsApp settings">
        <form onSubmit={(e) => void saveWhatsAppSettings(e)} className="space-y-3">
          <div>
            <Label htmlFor="wa-product">Product (buy replies)</Label>
            <select
              id="wa-product"
              value={waDefaultProductId}
              onChange={(e) => setWaDefaultProductId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <option value="">Latest product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="wa-recipients">Publish to (phones)</Label>
            <Input
              id="wa-recipients"
              value={waPublishRecipients}
              onChange={(e) => setWaPublishRecipients(e.target.value)}
              placeholder="9876543210, 9123456789"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="wa-notify">Your phone (order alerts)</Label>
            <Input
              id="wa-notify"
              value={waNotifyPhone}
              onChange={(e) => setWaNotifyPhone(e.target.value)}
              className="mt-1"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={waAutoReplyEnabled}
              onChange={(e) => setWaAutoReplyEnabled(e.target.checked)}
            />
            Buy auto-reply
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={waAlertsEnabled}
              onChange={(e) => setWaAlertsEnabled(e.target.checked)}
            />
            Order alerts
          </label>
          <Button type="submit" className="w-full" loading={waSaving}>
            Save
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(metaPendingId)}
        onClose={() => {
          setMetaPendingId(null);
          setMetaPages([]);
        }}
        title="Select page"
      >
        {metaPagesLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {metaPages.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-sm hover:bg-white/10"
                  disabled={connecting !== null}
                  onClick={() => void completeMetaPage(p.id)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        open={Boolean(googlePendingId)}
        onClose={() => {
          setGooglePendingId(null);
          setGoogleAccounts([]);
        }}
        title="Select Google Business"
      >
        {googleAccountsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {googleAccounts.map((a) => (
              <li key={a.name}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-sm hover:bg-white/10"
                  disabled={connecting !== null}
                  onClick={() => void completeGoogleBusinessAccount(a.name)}
                >
                  {a.accountName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </motion.div>
  );
}

export default function SocialPage() {
  return (
    <Suspense fallback={<div className="glass-card h-40 animate-pulse" />}>
      <SocialContent />
    </Suspense>
  );
}
