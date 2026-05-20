'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, ShoppingCart, Users, TrendingUp, Calendar, MessageCircle } from 'lucide-react';
import { KPICard } from '@/components/dashboard/kpi-card';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { canEditContent } from '@/lib/roles';

function DashboardContent() {
  const searchParams = useSearchParams();
  const accessDenied = searchParams.get('access') === 'denied';
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
          Data is stored in memory only (lost when API restarts). Add firebase-service-account.json and set USE_DEV_STORE=false — see docs/FIREBASE_QUICKSTART.md
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => <KPICard key={kpi.title} {...kpi} />)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          {data?.recentOrders?.length ? (
            <div className="mt-4 space-y-2">
              {data.recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-sm">
                  <span>{o.orderNumber}</span>
                  <span className="font-medium">₹{o.total?.toLocaleString('en-IN')}</span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">{o.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No orders yet. Share your product link to get sales!</p>
          )}
        </div>
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold">Activity</h2>
          <div className="mt-4 space-y-2">
            {data?.recentActivity?.length ? data.recentActivity.map((a) => (
              <div key={a.id} className="rounded-lg bg-white/5 px-4 py-3 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="text-muted-foreground">{a.body}</p>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">Activity from orders and notifications will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="glass-card h-32 animate-pulse" />}>
      <DashboardContent />
    </Suspense>
  );
}
