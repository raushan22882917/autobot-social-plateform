'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { apiClient, User, UserRole } from '@/lib/api';
import { PageHeader, DataToolbar, EmptyState } from '@/components/data';
import { isSuperAdmin, getRoleLabel } from '@/lib/roles';
import { Users } from 'lucide-react';

export default function AdminUsersPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiClient
      .getPlatformUsers(token, search || undefined)
      .then((r) => setUsers(r.users))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, search]);

  useEffect(() => {
    if (isSuperAdmin(user?.role)) load();
  }, [load, user?.role]);

  async function changeRole(uid: string, role: UserRole) {
    if (!token) return;
    setSaving(uid);
    try {
      const { user: updated } = await apiClient.updatePlatformUserRole(token, uid, role);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? updated : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setSaving(null);
    }
  }

  if (!isSuperAdmin(user?.role)) {
    return <p className="p-12 text-sm text-muted-foreground">Platform admin access only.</p>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="All users" description="View and manage roles for every user on the platform." />

      <DataToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by email, name, store…"
        onReset={load}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-instagram border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No users found" description="Try a different search." />
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-muted">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.displayName}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground/80">{u.storeName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-instagram">{getRoleLabel(u.role)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={saving === u.uid}
                      onChange={(e) => changeRole(u.uid, e.target.value as UserRole)}
                      className="field-input max-w-[160px] py-1.5 text-xs"
                    >
                      <option value="superadmin">Platform admin</option>
                      <option value="owner">Store owner</option>
                      <option value="admin">Team member</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
