'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/data';
import { isSuperAdmin } from '@/lib/roles';
import { Building2 } from 'lucide-react';

type TenantRow = {
  tenantId: string;
  storeName: string;
  plan: string;
  status: string;
  ownerEmail?: string;
  memberCount: number;
  createdAt: string;
};

export default function AdminTenantsPage() {
  const { token, user } = useAuth();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !isSuperAdmin(user?.role)) return;
    apiClient
      .getPlatformTenants(token)
      .then((r) => setTenants(r.tenants))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, user?.role]);

  if (!isSuperAdmin(user?.role)) {
    return <p className="p-12 text-sm text-muted-foreground">Platform admin access only.</p>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="All stores" description="Every tenant / store on the platform." />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-instagram border-t-transparent" />
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState icon={<Building2 className="h-8 w-8" />} title="No stores yet" description="" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t) => (
            <div key={t.tenantId} className="glass-card p-5">
              <h3 className="font-bold">{t.storeName}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t.ownerEmail || 'No owner email'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="badge badge-cyan">{t.plan}</span>
                <span className="badge badge-instagram">{t.memberCount} members</span>
              </div>
              <p className="mt-3 font-mono text-[10px] text-muted-foreground">{t.tenantId}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
