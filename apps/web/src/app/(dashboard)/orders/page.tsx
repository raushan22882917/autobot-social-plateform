'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { apiClient, Order } from '@/lib/api';
import { PageHeader, DataToolbar, DataTable, StatusBadge, EmptyState, type Column } from '@/components/data';
import { useListControls } from '@/hooks/use-list-controls';

const STATUSES = ['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const list = useListControls({
    items: orders,
    searchKeys: ['orderNumber', (o: Order) => o.customer?.name || '', (o: Order) => o.customer?.email || ''],
    filterFn: (o: Order, f) => (f.status === 'all' ? true : o.status === f.status),
    sortKeys: {
      orderNumber: (a: Order, b: Order) => a.orderNumber.localeCompare(b.orderNumber),
      total: (a: Order, b: Order) => a.total - b.total,
      createdAt: (a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    defaultSortKey: 'createdAt',
    defaultSortDir: 'desc',
    pageSize: 15,
  });

  function load() {
    if (!token) return;
    setLoading(true);
    apiClient.getOrders(token).then((r) => setOrders(r.orders)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [token]);

  async function updateStatus(id: string, status: string) {
    if (!token) return;
    await apiClient.updateOrderStatus(token, id, status);
    load();
  }

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      sortable: true,
      cell: (o) => <span className="font-medium">{o.orderNumber}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (o) => (
        <div>
          <p>{o.customer?.name || '—'}</p>
          {o.customer?.email && <p className="text-xs text-muted-foreground">{o.customer.email}</p>}
          {(o.customer?.platform || o.platform) && (
            <p className="text-xs text-muted-foreground capitalize">
              via {(o.customer?.platform || o.platform) as string}
              {o.source === 'product_analysis' || o.source === 'product_analysis_auto'
                ? ' · Product Analysis'
                : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      cell: (o) => <span className="font-semibold">₹{o.total?.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      cell: (o) => (
        <span className="text-muted-foreground">
          {new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Update status',
      className: 'text-right',
      cell: (o) => (
        <select
          value={o.status}
          onChange={(e) => updateStatus(o.id, e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs"
          aria-label={`Update status for ${o.orderNumber}`}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Orders" description="Track and update customer orders." />

      <DataToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search order #, customer…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [{ value: 'all', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))],
          },
        ]}
        filterValues={list.filters}
        onFilterChange={list.setFilter}
        onReset={list.reset}
        totalCount={list.totalCount}
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        extra={<button type="button" onClick={load} className="text-xs text-brand-instagram hover:underline">Refresh</button>}
      />

      {!loading && orders.length === 0 ? (
        <EmptyState title="No orders yet" description="Orders appear here when customers checkout." />
      ) : (
        <DataTable
          columns={columns}
          data={list.paginated}
          loading={loading}
          sortKey={list.sortKey}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          rowKey={(o) => o.id}
          emptyMessage="No orders match your filters"
        />
      )}
    </motion.div>
  );
}
