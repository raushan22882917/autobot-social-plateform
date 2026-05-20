import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { getRoleLabel } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/data';

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();

  useEffect(() => {
    refreshUser().catch(() => {});
  }, [refreshUser]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Your profile and store preferences." />
      <motion.div layout className="glass-card space-y-4 p-6">
        <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{user?.displayName}</p></div>
        <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{user?.email}</p></div>
        <div><p className="text-sm text-muted-foreground">Store</p><p className="font-medium">{user?.storeName || '—'}</p></div>
        <div><p className="text-sm text-muted-foreground">Role</p><p className="font-medium">{user?.role ? getRoleLabel(user.role) : '—'}</p></div>
        <div><p className="text-sm text-muted-foreground">Tenant ID</p><p className="font-mono text-xs text-muted-foreground">{user?.tenantId}</p></div>
        <Button variant="danger" onClick={logout}>Sign out</Button>
      </motion.div>
    </motion.div>
  );
}
