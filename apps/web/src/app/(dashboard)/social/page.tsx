'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import { motion } from 'framer-motion';
import { Instagram, Facebook, Youtube, Link2, Unlink, AlertCircle, CheckCircle2 } from 'lucide-react';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.869 1.171l-.346.217-3.597-.094 1.447 3.828.6.092c1.644.007 3.203.635 4.382 1.77 1.18 1.136 1.844 2.652 1.844 4.248 0 .975-.186 1.923-.537 2.82l-.088.345 3.601.545.092-.003a9.936 9.936 0 001.449-19.726z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.418-.103.249-.129.597-.129.946v5.441h-3.554s.05-8.736 0-9.646h3.554v1.364c.43-.664 1.199-1.608 2.928-1.608 2.136 0 3.745 1.393 3.745 4.385v5.505zM5.337 9.433c-1.144 0-1.915-.758-1.915-1.704 0-.951.77-1.707 1.968-1.707 1.197 0 1.911.756 1.935 1.704 0 .946-.738 1.707-1.988 1.707zm1.946 11.019H3.39V9.787h3.893v10.665zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.042 0-.084 0-.126-.01l.214-3.03 5.514-4.98c.24-.213-.054-.328-.373-.115L8.48 10.384l-2.99-.936c-.65-.203-.658-.65.135-.968l11.703-4.51c.54-.203 1.01.128.84.943z" />
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
import { apiClient, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PageHeader, DataToolbar, DataTable, StatusBadge, type Column } from '@/components/data';
import { useListControls } from '@/hooks/use-list-controls';

/** OAuth supported by API (see services/api social-connect) */
const OAUTH_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
  { id: 'facebook', name: 'Facebook Page', icon: Facebook, color: 'from-blue-600 to-blue-800' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'from-red-500 to-red-700' },
  { id: 'tiktok', name: 'TikTok', icon: TikTokIcon, color: 'from-gray-800 to-gray-950' },
  { id: 'linkedin', name: 'LinkedIn', icon: LinkedInIcon, color: 'from-blue-700 to-blue-900' },
] as const;

const COMING_SOON_PLATFORMS = [
  { id: 'whatsapp', name: 'WhatsApp Business', icon: WhatsAppIcon, color: 'from-green-500 to-teal-600' },
  { id: 'pinterest', name: 'Pinterest', icon: PinterestIcon, color: 'from-red-600 to-red-700' },
  { id: 'telegram', name: 'Telegram', icon: TelegramIcon, color: 'from-cyan-500 to-blue-600' },
  { id: 'google_business', name: 'Google Business', icon: GoogleBusinessIcon, color: 'from-yellow-500 to-red-500' },
] as const;

const PLATFORMS = [...OAUTH_PLATFORMS, ...COMING_SOON_PLATFORMS];

type PlatformId = (typeof PLATFORMS)[number]['id'];

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  displayName?: string;
  status: string;
}

function SocialContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [platformStatus, setPlatformStatus] = useState<
    Record<string, { configured: boolean; canConnect?: boolean }>
  >({});
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const load = useCallback(() => {
    if (!token) return;
    apiClient.getSocialAccounts(token).then((r) => setAccounts(r.accounts as SocialAccount[]));
    apiClient.getSocialStatus(token).then((r) => setPlatformStatus(r.platforms)).catch(() => {});
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) {
      setBanner({ type: 'success', message: `${connected} connected successfully.` });
      load();
      window.history.replaceState({}, '', '/social');
    } else if (error) {
      setBanner({ type: 'error', message: decodeURIComponent(error) });
      window.history.replaceState({}, '', '/social');
    }
  }, [searchParams, load]);

  async function connect(platform: PlatformId) {
    if (!token) {
      setBanner({ type: 'error', message: 'Please sign in again.' });
      return;
    }
    if (COMING_SOON_PLATFORMS.some((p) => p.id === platform)) return;

    setConnecting(platform);
    setBanner(null);
    try {
      const { authUrl, mode } = await apiClient.getSocialConnectUrl(token, platform);
      if (mode === 'oauth' && authUrl) {
        window.location.href = authUrl;
        return;
      }
      throw new Error('OAuth URL not available. Add API keys in services/api/.env');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not start connection';
      setBanner({ type: 'error', message: msg });
      setConnecting(null);
    }
  }

  async function disconnect(id: string) {
    if (!token) return;
    await apiClient.disconnectSocial(token, id);
    load();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Social connections"
        description="Connect accounts via OAuth. Tokens are stored securely on the server."
      />

      {banner && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/30 bg-red-500/10 text-red-200'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{banner.message}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {PLATFORMS.map((platform) => {
          const connected = accounts.find((a) => a.platform === platform.id && a.status === 'active');
          const comingSoon = COMING_SOON_PLATFORMS.some((p) => p.id === platform.id);
          const isOAuthPlatform = OAUTH_PLATFORMS.some((p) => p.id === platform.id);
          const oauthReady = platformStatus[platform.id]?.configured === true;
          const Icon = platform.icon;
          return (
            <div key={platform.id} className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${platform.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{platform.name}</h3>
                  {connected ? (
                    <p className="text-sm text-emerald-400">
                      @{connected.username}
                      {connected.displayName ? ` · ${connected.displayName}` : ''}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {comingSoon
                        ? 'Coming soon'
                        : oauthReady
                          ? 'Not connected — real OAuth'
                          : 'Add API keys in services/api/.env'}
                    </p>
                  )}
                </div>
                {connected ? (
                  <Button variant="ghost" size="sm" onClick={() => disconnect(connected.id)}>
                    <Unlink className="h-4 w-4" /> Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    loading={connecting === platform.id}
                    disabled={comingSoon || !isOAuthPlatform}
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
          <h2 className="text-lg font-semibold">Connected accounts</h2>
          <DataToolbar
            search={accountList.search}
            onSearchChange={accountList.setSearch}
            searchPlaceholder="Search accounts…"
            filters={[
              {
                key: 'platform',
                label: 'Platform',
                options: [
                  { value: 'all', label: 'All platforms' },
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
                  cell: (a) => <span className="capitalize font-medium">{a.platform}</span>,
                },
                {
                  key: 'username',
                  header: 'Account',
                  sortable: true,
                  cell: (a) => (
                    <div>
                      <p>@{a.username}</p>
                      {a.displayName && <p className="text-xs text-muted-foreground">{a.displayName}</p>}
                    </div>
                  ),
                },
                { key: 'status', header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
                {
                  key: 'actions',
                  header: 'Actions',
                  className: 'text-right',
                  cell: (a) => (
                    <Button variant="ghost" size="sm" onClick={() => disconnect(a.id)}>
                      <Unlink className="h-4 w-4" /> Disconnect
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
            emptyMessage="No accounts match filters"
          />
        </>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">Meta (Instagram / Facebook)</p>
        <p>
          Register these redirect URIs in{' '}
          <a
            className="text-violet-400 underline"
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noreferrer"
          >
            Meta Developer Console
          </a>
          :
        </p>
        <ul className="list-inside list-disc font-mono text-[11px]">
          <li>http://localhost:8081/api/v1/social/oauth/callback/instagram</li>
          <li>http://localhost:8081/api/v1/social/oauth/callback/facebook</li>
        </ul>
        <p className="font-medium text-foreground pt-2">Google (login + YouTube)</p>
        <p>
          Same OAuth Web client as Firebase. Add <strong>all</strong> redirect URIs (login uses Firebase handler):
        </p>
        <ul className="list-inside list-disc font-mono text-[11px] break-all">
          <li>https://autobot-founder.firebaseapp.com/__/auth/handler</li>
          <li>http://localhost:8081/api/v1/social/oauth/callback/youtube</li>
        </ul>
        <p>JavaScript origins: http://localhost:3001, https://autobot-founder.firebaseapp.com</p>
        <p>Instagram requires a Business/Creator account linked to a Facebook Page.</p>
        <p className="font-medium text-foreground pt-2">TikTok</p>
        <p>
          <a className="text-violet-400 underline" href="https://developers.tiktok.com/" target="_blank" rel="noreferrer">
            TikTok for Developers
          </a>{' '}
          → Login Kit redirect URI:
        </p>
        <ul className="list-inside list-disc font-mono text-[11px]">
          <li>http://localhost:8081/api/v1/social/oauth/callback/tiktok</li>
        </ul>
        <p className="font-medium text-foreground pt-2">LinkedIn</p>
        <p>
          <a className="text-violet-400 underline" href="https://www.linkedin.com/developers/apps" target="_blank" rel="noreferrer">
            LinkedIn Developers
          </a>{' '}
          → create app → Auth → add redirect URL and enable{' '}
          <strong>Sign In with LinkedIn using OpenID Connect</strong> + <strong>Share on LinkedIn</strong>:
        </p>
        <ul className="list-inside list-disc font-mono text-[11px]">
          <li>http://localhost:8081/api/v1/social/oauth/callback/linkedin</li>
        </ul>
        <p className="text-[11px]">
          Set <span className="font-mono">LINKEDIN_CLIENT_ID</span> and{' '}
          <span className="font-mono">LINKEDIN_CLIENT_SECRET</span> in <span className="font-mono">services/api/.env</span>, then restart the API.
        </p>
      </div>
    </motion.div>
  );
}

export default function SocialPage() {
  return (
    <Suspense fallback={<SocialPageFallback />}>
      <SocialContent />
    </Suspense>
  );
}

function SocialPageFallback() {
  return <div className="glass-card h-40 animate-pulse" />;
}
