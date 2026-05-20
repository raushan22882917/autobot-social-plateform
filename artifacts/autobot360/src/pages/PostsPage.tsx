;

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Calendar, Send, X } from 'lucide-react';
import { PublishLinks } from '@/components/publish-links';
import { getPublishLinks } from '@/lib/publish-links';
import { YouTubePrivacySelector, type YouTubePrivacy } from '@/components/youtube-privacy-selector';
import { PostDetailModal } from '@/components/post-detail-modal';
import { useAuth } from '@/hooks/use-auth';
import { apiClient, Product, ScheduledPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader, DataToolbar, DataTable, StatusBadge, EmptyState, type Column } from '@/components/data';
import { useListControls } from '@/hooks/use-list-controls';

const PLATFORMS = ['instagram', 'facebook', 'youtube', 'tiktok'];

export default function PostsPage() {
  const { token } = useAuth();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: '',
    platforms: ['instagram'] as string[],
    scheduledAt: '',
    useAiCaption: true,
    youtubePrivacy: 'unlisted' as YouTubePrivacy,
  });
  const [updatingPrivacyId, setUpdatingPrivacyId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);

  const list = useListControls({
    items: posts,
    searchKeys: ['productTitle', 'productId', (p) => p.platforms.join(' ')],
    filterFn: (p, f) => {
      if (f.status !== 'all' && p.status !== f.status) return false;
      if (f.platform !== 'all' && !p.platforms.includes(f.platform)) return false;
      return true;
    },
    sortKeys: {
      scheduledAt: (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      productTitle: (a, b) => (a.productTitle || a.productId).localeCompare(b.productTitle || b.productId),
    },
    defaultSortKey: 'scheduledAt',
    defaultSortDir: 'desc',
    pageSize: 12,
  });

  function load() {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    Promise.all([apiClient.getScheduledPosts(token), apiClient.getProducts(token)])
      .then(([p, prod]) => {
        setPosts(p.posts || []);
        setProducts(prod.products || []);
      })
      .catch((err) => {
        setPosts([]);
        setProducts([]);
        setLoadError(err instanceof Error ? err.message : 'Failed to load posts');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [token]);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await apiClient.schedulePost(token, {
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        socialAccountIds: [],
        youtubePrivacy: form.platforms.includes('youtube') ? form.youtubePrivacy : undefined,
      });
      setModalOpen(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  function togglePlatform(p: string) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  }

  async function publishNow(id: string) {
    if (!token) return;
    try {
      await apiClient.publishNow(token, id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Publish failed');
      load();
    }
  }

  async function setYouTubePrivacy(postId: string, privacy: YouTubePrivacy) {
    if (!token) return;
    setUpdatingPrivacyId(postId);
    try {
      await apiClient.updateYouTubePrivacy(token, postId, privacy);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, youtubePrivacy: privacy } : p))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update YouTube visibility');
    } finally {
      setUpdatingPrivacyId(null);
    }
  }

  const columns: Column<ScheduledPost>[] = [
    {
      key: 'productTitle',
      header: 'Post',
      sortable: true,
      cell: (post) => (
        <div>
          <p className="font-medium">{post.productTitle || post.productId}</p>
          <p className="text-xs text-muted-foreground capitalize">{post.platforms.join(', ')}</p>
        </div>
      ),
    },
    {
      key: 'scheduledAt',
      header: 'Scheduled',
      sortable: true,
      cell: (post) => (
        <span className="text-muted-foreground">
          {new Date(post.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (post) => <StatusBadge status={post.status} />,
    },
    {
      key: 'youtube',
      header: 'YouTube',
      cell: (post) => {
        if (!post.platforms.includes('youtube')) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        const privacy = (post.youtubePrivacy || 'unlisted') as YouTubePrivacy;
        return (
          <YouTubePrivacySelector
            compact
            value={privacy}
            disabled={updatingPrivacyId === post.id}
            onChange={(p) => void setYouTubePrivacy(post.id, p)}
          />
        );
      },
    },
    {
      key: 'error',
      header: 'Publish links',
      cell: (post) => {
        const links = getPublishLinks(post.publishResults);
        if (links.length > 0) {
          return (
            <motion.div layout className="max-w-xs space-y-2">
              <PublishLinks results={post.publishResults} />
              {post.youtubePrivacy && post.platforms.includes('youtube') && (
                <p className="text-[10px] text-muted-foreground capitalize">
                  Visibility: {post.youtubePrivacy}
                </p>
              )}
            </motion.div>
          );
        }
        if (post.publishError) {
          return <span className="max-w-xs text-xs text-red-400 line-clamp-2">{post.publishError}</span>;
        }
        if (post.status === 'published' && post.publishResults) {
          return (
            <span className="text-xs text-muted-foreground">
              Published (links unavailable for older posts)
            </span>
          );
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      cell: (post) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => setSelectedPost(post)}>
            View
          </Button>
          {(post.status === 'pending' || post.status === 'failed') && (
            <Button size="sm" variant="secondary" onClick={() => publishNow(post.id)}>
              <Send className="h-3 w-3" /> Now
            </Button>
          )}
          {post.status === 'pending' && (
            <Button size="sm" variant="ghost" onClick={() => token && apiClient.cancelPost(token, post.id).then(load)}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Scheduled posts"
        description="Click a post for likes, comments, AI reply help, and sales checkout flow."
        actions={
          <>
            <Link href="/studio">
              <Button variant="secondary">Open Studio</Button>
            </Link>
            <Button onClick={() => setModalOpen(true)}>
              <Calendar className="h-4 w-4" /> Schedule post
            </Button>
          </>
        }
      />

      {loadError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError} — check API on port 8081 and sign-in.
        </div>
      )}

      <DataToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search posts…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'all', label: 'All statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'processing', label: 'Processing' },
              { value: 'published', label: 'Published' },
              { value: 'failed', label: 'Failed' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
          },
          {
            key: 'platform',
            label: 'Platform',
            options: [{ value: 'all', label: 'All platforms' }, ...PLATFORMS.map((p) => ({ value: p, label: p }))],
          },
        ]}
        filterValues={list.filters}
        onFilterChange={list.setFilter}
        onReset={list.reset}
        totalCount={list.totalCount}
        sourceCount={posts.length}
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        extra={
          <button type="button" onClick={load} className="text-xs text-violet-400 hover:underline">
            Refresh
          </button>
        }
      />

      {!loading && posts.length === 0 ? (
        <EmptyState
          title="No scheduled posts"
          description="Create posts in Studio or schedule from here."
          action={{ label: 'Schedule post', onClick: () => setModalOpen(true) }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={list.paginated}
          loading={loading}
          sortKey={list.sortKey}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          onRowClick={(p) => setSelectedPost(p)}
          rowKey={(p) => p.id}
          emptyMessage={
            posts.length > 0
              ? 'No posts match your filters — reset or set status to “All statuses”.'
              : 'No posts'
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Schedule post">
        <form onSubmit={handleSchedule} className="space-y-4">
          <div>
            <Label>Product</Label>
            <select
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              required
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Platforms</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
                    form.platforms.includes(p) ? 'bg-violet-500/30 text-violet-300' : 'bg-white/5 text-muted-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {form.platforms.includes('youtube') && (
            <YouTubePrivacySelector
              value={form.youtubePrivacy}
              onChange={(youtubePrivacy) => setForm({ ...form, youtubePrivacy })}
            />
          )}
          <div>
            <Label>Schedule date & time</Label>
            <Input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              required
              className="mt-1"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.useAiCaption}
              onChange={(e) => setForm({ ...form, useAiCaption: e.target.checked })}
            />
            Generate AI caption with Gemini
          </label>
          <Button type="submit" className="w-full" loading={saving}>
            Schedule post
          </Button>
        </form>
      </Modal>

      <PostDetailModal
        post={selectedPost}
        token={token}
        open={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
        onUpdated={load}
      />
    </motion.div>
  );
}
