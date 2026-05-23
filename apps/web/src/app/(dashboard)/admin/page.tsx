'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, Building2, ShoppingCart, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/data';
import { isSuperAdmin } from '@/lib/roles';

export default function AdminOverviewPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalTenants: number;
    totalOrders: number;
    usersByRole: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    if (!token || !isSuperAdmin(user?.role)) return;
    apiClient.getPlatformStats(token).then(setStats).catch(console.error);
  }, [token, user?.role]);

  if (!isSuperAdmin(user?.role)) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Platform admin access only.</p>
      </div>
    );
  }

  const cards = [
    { label: 'Total users', value: stats?.totalUsers ?? '—', icon: Users, href: '/admin/users', color: 'text-brand-instagram' },
    { label: 'Stores', value: stats?.totalTenants ?? '—', icon: Building2, href: '/admin/tenants', color: 'text-brand-facebook' },
    { label: 'Orders', value: stats?.totalOrders ?? '—', icon: ShoppingCart, href: '/orders', color: 'text-brand-whatsapp' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <PageHeader
        title="Platform admin"
        description="Manage all users, stores, and roles across AutoBot360."
      />

      <div className="glow-card flex items-center gap-4 p-5">
        <Shield className="h-8 w-8 text-brand-instagram" />
        <div>
          <p className="font-semibold text-foreground">Signed in as platform admin</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="metric-card group block">
            <div className="flex items-center justify-between">
              <c.icon className={`h-5 w-5 ${c.color}`} />
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:text-brand-instagram" />
            </div>
            <p className="mt-4 text-3xl font-bold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      {stats?.usersByRole && (
        <div className="glass-card p-6">
          <h3 className="mb-4 font-semibold">Users by role</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.usersByRole).map(([role, count]) => (
              <span key={role} className="badge badge-instagram">
                {role}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
