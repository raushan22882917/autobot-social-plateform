'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getNavForRole, getRoleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';

function Initials({ name }: { name?: string }) {
  const s = (name || 'U')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-instagram text-sm font-bold text-white shadow-lg shadow-brand-instagram/25">
      {s}
    </div>
  );
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title?: string;
  items: ReturnType<typeof getNavForRole>['main'];
  pathname: string;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-0.5">
      {title && (
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
      )}
      {items.map((item) => {
        const active =
          pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} className={cn('nav-item', active && 'nav-item-active')}>
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                active ? 'bg-brand-instagram/15' : 'bg-brand-facebook/5'
              )}
            >
              <item.icon
                className={cn('h-3.5 w-3.5', active ? 'text-brand-instagram' : 'text-muted-foreground')}
              />
            </div>
            <span className="flex-1">{item.label}</span>
            {active && <ChevronRight className="h-3 w-3 text-brand-instagram/60" />}
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname() || '';
  const { user } = useAuth();
  const { platform, main, bottom } = getNavForRole(user?.role);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-instagram shadow shadow-brand-instagram/30">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <Link href={user?.role === 'superadmin' ? '/admin' : '/dashboard'} className="text-lg font-black gradient-text">
          AutoBot360
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <NavSection title="Platform" items={platform} pathname={pathname} />
        <NavSection title={platform.length ? 'Store' : undefined} items={main} pathname={pathname} />
      </nav>

      <div className="space-y-0.5 border-t border-border px-3 pb-2 pt-3">
        {bottom.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn('nav-item', active && 'nav-item-active')}>
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                  active ? 'bg-brand-instagram/15' : 'bg-brand-facebook/5'
                )}
              >
                <item.icon
                  className={cn('h-3.5 w-3.5', active ? 'text-brand-instagram' : 'text-muted-foreground')}
                />
              </div>
              {item.label}
            </Link>
          );
        })}

        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-muted px-3 py-3">
          <Initials name={user?.displayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{user?.displayName || 'User'}</p>
            {user?.storeName && (
              <p className="truncate text-xs text-muted-foreground">{user.storeName}</p>
            )}
          </div>
          {user?.role && (
            <span
              className={cn(
                'badge shrink-0',
                user.role === 'superadmin'
                  ? 'badge-facebook'
                  : user.role === 'owner'
                    ? 'badge-instagram'
                    : 'badge-google'
              )}
            >
              {getRoleLabel(user.role)}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
