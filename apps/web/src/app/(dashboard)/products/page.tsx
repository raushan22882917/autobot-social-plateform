'use client';

;

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Trash2, ExternalLink, Package, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient, Product } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader, DataToolbar, DataTable, StatusBadge, EmptyState, type Column } from '@/components/data';
import { useListControls } from '@/hooks/use-list-controls';

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [form, setForm] = useState({ title: '', description: '', price: '', sku: '', inventory: '10' });
  const [loadError, setLoadError] = useState<string | null>(null);

  const list = useListControls({
    items: products,
    searchKeys: ['title', 'sku', 'description', (p) => String(p.price)],
    filterFn: (p, f) => (f.status === 'all' ? true : p.status === f.status),
    sortKeys: {
      title: (a, b) => a.title.localeCompare(b.title),
      price: (a, b) => a.price - b.price,
      inventory: (a, b) => a.inventory - b.inventory,
      createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    defaultSortKey: 'createdAt',
    defaultSortDir: 'desc',
    pageSize: 10,
  });

  function load() {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    apiClient
      .getProducts(token)
      .then((r) => setProducts(r.products || []))
      .catch((err) => {
        setProducts([]);
        setLoadError(err instanceof Error ? err.message : 'Failed to load products');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await apiClient.createProduct(token, {
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        sku: form.sku || `SKU-${Date.now()}`,
        inventory: parseInt(form.inventory, 10),
        status: 'active',
      });
      setModalOpen(false);
      setForm({ title: '', description: '', price: '', sku: '', inventory: '10' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token || !confirm('Archive this product?')) return;
    await apiClient.deleteProduct(token, id);
    load();
  }

  const columns: Column<Product>[] = [
    {
      key: 'title',
      header: 'Product',
      sortable: true,
      cell: (p) => (
        <motion.div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-instagram/15">
            {p.images?.[0]?.url ? (
              <img src={p.images[0].url} alt="" className="h-full w-full rounded-lg object-cover" />
            ) : (
              <Package className="h-5 w-5 text-brand-instagram" />
            )}
          </div>
          <div>
            <p className="font-medium">{p.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{p.sku}</p>
          </div>
        </motion.div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      cell: (p) => <span className="font-semibold text-brand-instagram">₹{p.price.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'inventory',
      header: 'Stock',
      sortable: true,
      cell: (p) => p.inventory,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      cell: (p) => (
        <span className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('en-IN')}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <Link href={`/p/${p.slug}?id=${p.id}`} target="_blank">
            <Button variant="ghost" size="sm" aria-label="View product">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)} aria-label="Delete product">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product catalog — search, filter, and export-ready table view."
        actions={
          <>
            <div className="flex rounded-xl border border-white/10 p-0.5">
              <button
                type="button"
                onClick={() => setView('table')}
                className={`rounded-lg p-2 ${view === 'table' ? 'bg-brand-instagram/30 text-brand-instagram' : 'text-muted-foreground'}`}
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('grid')}
                className={`rounded-lg p-2 ${view === 'grid' ? 'bg-brand-instagram/30 text-brand-instagram' : 'text-muted-foreground'}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Add product
            </Button>
          </>
        }
      />

      {loadError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError} — check that the API is running on port 8081 and you are signed in.
        </div>
      )}

      <DataToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search by title, SKU, price…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ],
          },
        ]}
        filterValues={list.filters}
        onFilterChange={list.setFilter}
        onReset={list.reset}
        totalCount={list.totalCount}
        sourceCount={products.length}
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        extra={
          <Button type="button" variant="secondary" size="sm" onClick={load}>
            Refresh
          </Button>
        }
      />

      {!loading && products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product to sell and schedule social posts."
          action={{ label: 'Add product', onClick: () => setModalOpen(true) }}
        />
      ) : view === 'table' ? (
        <DataTable
          columns={columns}
          data={list.paginated}
          loading={loading}
          sortKey={list.sortKey}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          rowKey={(p) => p.id}
          emptyMessage={
            products.length > 0
              ? 'No products match your filters — reset filters or choose “All statuses”.'
              : 'No products'
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.paginated.length === 0 && products.length > 0 && (
            <div className="col-span-full glass-card py-8 text-center text-sm text-muted-foreground">
              No products match filters.{' '}
              <button type="button" className="text-brand-instagram underline" onClick={list.reset}>
                Clear filters
              </button>
            </div>
          )}
          {list.paginated.map((p) => (
            <div key={p.id} className="glass-card overflow-hidden">
              <motion.div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-instagram/15 to-brand-facebook/15">
                {p.images?.[0]?.url ? (
                  <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-12 w-12 text-brand-instagram/50" />
                )}
              </motion.div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="text-lg font-bold text-brand-instagram">₹{p.price.toLocaleString('en-IN')}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                <div className="mt-4 flex gap-2">
                  <Link href={`/p/${p.slug}?id=${p.id}`} target="_blank" className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      <ExternalLink className="h-3 w-3" /> View
                    </Button>
                  </Link>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add product">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <motion.div>
              <Label>Price (₹)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="mt-1" />
            </motion.div>
            <div>
              <Label>Inventory</Label>
              <Input type="number" value={form.inventory} onChange={(e) => setForm({ ...form, inventory: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>SKU</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="mt-1" />
          </div>
          <Button type="submit" className="w-full" loading={saving}>
            Create product
          </Button>
        </form>
      </Modal>
    </motion.div>
  );
}
