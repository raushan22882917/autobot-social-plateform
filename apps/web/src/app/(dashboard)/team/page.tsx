'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/data';
import { isOwner, getRoleLabel } from '@/lib/roles';
import { Button } from '@/components/ui/button';

export default function TeamPage() {
  const { token, user } = useAuth();
  const [members, setMembers] = useState<
    Array<{ uid: string; email: string; displayName?: string; role: string }>
  >([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiClient
      .getTeamMembers(token)
      .then((r) => setMembers(r.members))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (isOwner(user?.role)) load();
  }, [load, user?.role]);

  async function invite() {
    if (!token || !inviteEmail.trim()) return;
    try {
      await apiClient.inviteTeamMember(token, { email: inviteEmail.trim(), role: 'admin' });
      setInviteEmail('');
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Invite failed');
    }
  }

  async function remove(uid: string) {
    if (!token || !confirm('Remove this team member?')) return;
    try {
      await apiClient.removeTeamMember(token, uid);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Remove failed');
    }
  }

  if (!isOwner(user?.role)) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Only store owners can manage the team.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Team"
        description="Invite admins to help manage your store. Team members cannot access payments or team settings."
      />

      <div className="glass-card flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1.5 block text-sm font-medium text-foreground/80">Invite by email</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@example.com"
            className="field-input"
          />
        </div>
        <Button variant="primary" onClick={invite} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Send invite
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-instagram border-t-transparent" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No team members"
          description="Invite someone to collaborate on your store."
        />
      ) : (
        <div className="glass-card divide-y divide-white/10">
          {members.map((m) => (
            <div key={m.uid} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-medium">{m.displayName || m.email}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge badge-instagram">{getRoleLabel(m.role)}</span>
                {m.uid !== user?.uid && m.role !== 'owner' && (
                  <button
                    type="button"
                    onClick={() => remove(m.uid)}
                    className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/10"
                    aria-label="Remove member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
