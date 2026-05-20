'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Package, ShoppingCart, Users, TrendingUp, Calendar, MessageCircle,
  ArrowUpRight, ArrowDownRight, Plus, LayoutDashboard, Activity,
  Zap, ExternalLink
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api';
import { canEditContent } from '@/lib/roles';
import { N8nConnectionCard } from '@/components/dashboard/n8n-connection-card';

const statusColor: Record<string, string> = {
  paid:       'badge badge-emerald',
  completed:  'badge badge-emerald',
  pending:    'badge badge-amber',
  processing: 'badge badge-cyan',
  cancelled:  'badge badge-red',
  failed:     'badge badge-red',
};

const kpiDefs = [
  { key: 'revenue',      label: 'Revenue',         icon: TrendingUp,     fmt: (v: number) => `₹${v.toLocaleString('en-IN')}`, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  { key: 'orders',       label: 'Orders',           icon: ShoppingCart,   fmt: (v: number) => v.toLocaleString(),               color: 'text-violet-400',  bg: 'bg-violet-500/15' },
  { key: 'products',     label: 'Products',         icon: Package,        fmt: (v: number) => v.toLocaleString(),               color: 'text-cyan-400',    bg: 'bg-cyan-500/15' },
  { key: 'leads',        label: 'Leads',            icon: Users,          fmt: (v: number) => v.toLocaleString(),               color: 'text-pink-400',    bg: 'bg-pink-500/15' },
  { key: 'pendingPosts', label: 'Scheduled Posts',  icon: Calendar,       fmt: (v: number) => v.toLocaleString(),               color: 'text-amber-400',   bg: 'bg-amber-500/15' },
  { key: 'engagement',   label: 'Engagements',      icon: MessageCircle,  fmt: (v: number) => v.toLocaleString(),               color: 'text-blue-400',    bg: 'bg-blue-500/15' },
];

const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

function DashboardContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const location = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
  const accessDenied = new URLSearchParams(location.split('?')[1] || '').get('access') === 'denied';
  const { token, user } = useAuth();
  const [data, setData]       = useState<Awaited<ReturnType<typeof apiClient.getDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState<'memory' | 'firestore' | null>(null);

  useEffect(() => { apiClient.getAuthConfig().then((c) => setStorage(c.storage)).catch(() => {}); }, []);
  useEffect(() => {
    if (!token) return;
    apiClient.getDashboard(token).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-8">

      {/* Alerts */}
      {storage === 'memory' && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="text-sm">
            <span className="font-semibold text-amber-300">Memory-only mode</span>
            <span className="text-amber-200/70"> — data resets when the API restarts. Add firebase credentials to persist.</span>
          </div>
        </div>
      )}
      {accessDenied && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span className="text-sm text-amber-200/80">You don't have permission to open that page. Contact your store owner or admin.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-violet-400" />
            <h1 className="text-2xl font-black text-white">Dashboard</h1>
          </div>
          <p className="mt-1 text-sm text-white/50">
            Welcome back, <span className="text-white/80 font-medium">{user?.displayName || 'Seller'}</span>
            {user?.storeName && <span className="text-white/35"> · {user.storeName}</span>}
            {(user?.role) && <span className="badge badge-violet ml-2">{user.role}</span>}
          </p>
        </div>
        {canEditContent(user?.role) && (
          <div className="flex shrink-0 gap-2">
            <Link href="/products"
              className="flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/[0.09] hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Product
            </Link>
            <Link href="/posts" className="btn-primary py-2 px-4 text-sm">
              <Plus className="h-3.5 w-3.5" /> Schedule Post
            </Link>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="metric-card h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div initial="hidden" animate="show" variants={stagger}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          {kpiDefs.map((k) => {
            const val = data?.kpis?.[k.key as keyof typeof data.kpis] ?? 0;
            return (
              <motion.div key={k.key} variants={fadeUp} className="metric-card">
                <div className={`icon-pill mb-3 h-8 w-8 rounded-lg ${k.bg}`} style={{ background: 'none' }}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.bg}`}>
                    <k.icon className={`h-4 w-4 ${k.color}`} />
                  </div>
                </div>
                <div className={`text-2xl font-black ${k.color}`}>{k.fmt(val as number)}</div>
                <div className="mt-1 text-xs text-white/40">{k.label}</div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Mid row */}
      <div className="grid gap-5 lg:grid-cols-2">
        <N8nConnectionCard />

        {/* Activity */}
        <div className="glass-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-white">
              <Activity className="h-4 w-4 text-cyan-400" /> Recent Activity
            </h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />)}
            </div>
          ) : data?.recentActivity?.length ? (
            <ul className="space-y-2">
              {data.recentActivity.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:bg-white/[0.04]">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/20">
                    <Zap className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white/85">{a.title}</p>
                    <p className="mt-0.5 text-xs text-white/42">{a.body}</p>
                  </div>
                  <time className="shrink-0 text-xs text-white/30">{new Date(a.createdAt).toLocaleDateString('en-IN')}</time>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Activity className="mb-3 h-8 w-8 text-white/15" />
              <p className="text-sm text-white/35">No recent activity yet</p>
              <p className="mt-1 text-xs text-white/22">Activity will appear here as your store gets orders and engagement</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      {(loading || data?.recentOrders?.length) ? (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
            <h2 className="flex items-center gap-2 font-bold text-white">
              <ShoppingCart className="h-4 w-4 text-emerald-400" /> Recent Orders
            </h2>
            <Link href="/orders" className="flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition">
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white/35">Order</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white/35">Customer</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white/35">Total</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white/35">Status</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white/35">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {data?.recentOrders?.map((o) => (
                    <tr key={o.id} className="transition hover:bg-white/[0.025]">
                      <td className="px-6 py-4 font-semibold text-white/85">{o.orderNumber}</td>
                      <td className="px-6 py-4 text-white/55">{o.customer?.name || '—'}</td>
                      <td className="px-6 py-4 font-bold text-emerald-400">₹{o.total?.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className={statusColor[o.status] || 'badge badge-violet'}>{o.status}</span>
                      </td>
                      <td className="px-6 py-4 text-white/38">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </motion.div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => <div key={i} className="metric-card h-28 animate-pulse" />)}
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
