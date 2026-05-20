import { Suspense, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Package, ShoppingCart, Users, TrendingUp, Calendar, MessageCircle } from 'lucide-react';
import { KPICard } from '@/components/dashboard/kpi-card';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { canEditContent } from '@/lib/roles';
import { N8nConnectionCard } from '@/components/dashboard/n8n-connection-card';

function DashboardContent() {
  const [location] = useLocation();
  const accessDenied = new URLSearchParams(location.split('?')[1] || '').get('access') === 'denied';
  const { token, user } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof apiClient.getDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState<'memory' | 'firestore' | null>(null);

  useEffect(() => {
    apiClient.getAuthConfig().then((c) => setStorage(c.storage)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    apiClient.getDashboard(token)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const kpis = data ? [
    { title: 'Revenue', value: `₹${data.kpis.revenue.toLocaleString('en-IN')}`, change: 0, icon: TrendingUp },
    { title: 'Orders', value: String(data.kpis.orders), change: 0, icon: ShoppingCart },
    { title: 'Products', value: String(data.kpis.products), change: 0, icon: Package },
    { title: 'Leads', value: String(data.kpis.leads), change: 0, icon: Users },
    { title: 'Scheduled Posts', value: String(data.kpis.pendingPosts), change: 0, icon: Calendar },
    { title: 'Engagement', value: String(data.kpis.engagement), change: 0, icon: MessageCircle },
  ] : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {storage === 'memory' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Data is stored in memory only (lost when API restarts). Add firebase-service-account.json and set USE_DEV_STORE=false to persist.
        </div>
      )}
      {accessDenied && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          You don&apos;t have permission to open that page. Contact your store owner or admin.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.displayName || 'Seller'}
            {(user?.role || data?.user?.role) && (
              <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs capitalize text-violet-300">
                {user?.role || data?.user?.role}
              </span>
            )}
            {user?.storeName && (
              <span className="ml-2 text-xs text-muted-foreground">· {user.storeName}</span>
            )}
          </p>
        </div>
        {canEditContent(user?.role) && (
          <div className="flex gap-2">
            <Link href="/products"><Button variant="secondary">Add Product</Button></Link>
            <Link href="/posts"><Button>Schedule Post</Button></Link>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-24 animate-pulse" />)}
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          {kpis.map((k) => <KPICard key={k.title} {...k} />)}
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <N8nConnectionCard />

        <div className="glass-card p-6">
          <h2 className="font-semibold">Recent activity</h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />)}
            </div>
          ) : data?.recentActivity?.length ? (
            <ul className="mt-4 space-y-3">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.body}</p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString('en-IN')}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No recent activity yet.</p>
          )}
        </div>
      </div>

      {data?.recentOrders?.length ? (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent orders</h2>
            <Link href="/orders" className="text-xs text-violet-400 hover:underline">View all</Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2 pr-4">Order</th>
                  <th className="pb-2 pr-4">Customer</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2.5 pr-4 font-medium">{o.orderNumber}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{o.customer?.name || '—'}</td>
                    <td className="py-2.5 pr-4 font-semibold">₹{o.total?.toLocaleString('en-IN')}</td>
                    <td className="py-2.5">
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400 capitalize">{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{[...Array(6)].map((_, i) => <div key={i} className="glass-card h-24 animate-pulse" />)}</div>}>
      <DashboardContent />
    </Suspense>
  );
}
