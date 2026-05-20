import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api';
import { PageHeader, DataToolbar, DataTable, EmptyState, type Column } from '@/components/data';
import { useListControls } from '@/hooks/use-list-controls';

type Notification = { id: string; title: string; body: string; read: boolean; createdAt: string };

export default function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const list = useListControls({
    items: notifications,
    searchKeys: ['title', 'body'],
    filterFn: (n, f) => {
      if (f.read === 'all') return true;
      if (f.read === 'unread') return !n.read;
      if (f.read === 'read') return n.read;
      return true;
    },
    sortKeys: {
      createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      title: (a, b) => a.title.localeCompare(b.title),
    },
    defaultSortKey: 'createdAt',
    defaultSortDir: 'desc',
    pageSize: 15,
  });

  function load() {
    if (!token) return;
    setLoading(true);
    apiClient.getNotifications(token).then((r) => setNotifications(r.notifications)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [token]);

  const columns: Column<Notification>[] = [
    {
      key: 'title',
      header: 'Notification',
      sortable: true,
      cell: (n) => (
        <div className="flex items-start gap-3">
          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-400" aria-hidden />}
          <div>
            <p className={`font-medium ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{n.body}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'read',
      header: 'State',
      cell: (n) => (
        <span className={`rounded-full px-2 py-0.5 text-xs ${n.read ? 'bg-white/10 text-muted-foreground' : 'bg-violet-500/20 text-violet-300'}`}>
          {n.read ? 'Read' : 'Unread'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'When',
      sortable: true,
      cell: (n) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      ),
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Notifications"
        description={unreadCount ? `${unreadCount} unread` : 'All caught up'}
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <Bell className="h-4 w-4 text-violet-400" />
            {notifications.length} total
          </div>
        }
      />

      <DataToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search notifications…"
        filters={[
          {
            key: 'read',
            label: 'Read state',
            options: [
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread only' },
              { value: 'read', label: 'Read only' },
            ],
          },
        ]}
        filterValues={list.filters}
        onFilterChange={list.setFilter}
        onReset={list.reset}
        totalCount={list.totalCount}
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        extra={<button type="button" onClick={load} className="text-xs text-violet-400 hover:underline">Refresh</button>}
      />

      {!loading && notifications.length === 0 ? (
        <EmptyState title="No notifications" description="Alerts for orders, posts, and integrations appear here." />
      ) : (
        <DataTable
          columns={columns}
          data={list.paginated}
          loading={loading}
          sortKey={list.sortKey}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          rowKey={(n) => n.id}
          emptyMessage="No notifications match your filters"
        />
      )}
    </motion.div>
  );
}
