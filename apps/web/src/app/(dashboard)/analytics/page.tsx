'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api';
import { PageHeader, DataToolbar } from '@/components/data';

const PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<Awaited<ReturnType<typeof apiClient.getAnalytics>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiClient.getAnalytics(token).then(setData).finally(() => setLoading(false));
  }, [token, period]);

  const metrics = ['revenue', 'orders', 'leads', 'engagement'] as const;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Analytics" description="Overview of store performance and engagement." />

      <DataToolbar
        search=""
        onSearchChange={() => {}}
        hideSearch
        filters={[{ key: 'period', label: 'Period', options: PERIODS }]}
        filterValues={{ period }}
        onFilterChange={(_, v) => setPeriod(v)}
        extra={<span className="text-xs text-muted-foreground">{loading ? 'Loading…' : `Period: ${PERIODS.find((p) => p.value === period)?.label}`}</span>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((k) => (
          <motion.div key={k} layout className="glass-card p-5">
            <p className="text-sm font-medium capitalize text-muted-foreground">{k}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              {loading ? '—' : k === 'revenue' ? `₹${(data?.[k]?.total ?? 0).toLocaleString('en-IN')}` : data?.[k]?.total ?? 0}
            </p>
            {!loading && data?.[k]?.change !== undefined && (
              <p className={`mt-1 text-xs ${data[k].change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data[k].change >= 0 ? '+' : ''}{data[k].change}% vs prior period
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div layout className="glass-card p-6">
        <h2 className="font-semibold">AI insights</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect social accounts and publish posts to unlock AI-powered recommendations and trend analysis.
        </p>
      </motion.div>
    </motion.div>
  );
}
