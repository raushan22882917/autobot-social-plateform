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
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-sm font-bold text-white shadow-lg shadow-violet-900/40">
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
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white/30">{title}</p>
      )}
      {items.map((item) => {
        const active =
          pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} className={cn('nav-item', active && 'nav-item-active')}>
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                active ? 'bg-violet-500/20' : 'bg-white/[0.04]'
              )}
            >
              <item.icon className={cn('h-3.5 w-3.5', active ? 'text-violet-400' : 'text-white/40')} />
            </div>
            <span className="flex-1">{item.label}</span>
            {active && <ChevronRight className="h-3 w-3 text-violet-400/60" />}
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
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/[0.07] bg-[#060a12]/90 backdrop-blur-2xl">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 shadow shadow-violet-900/50">
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

      <div className="space-y-0.5 border-t border-white/[0.06] px-3 pb-2 pt-3">
        {bottom.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn('nav-item', active && 'nav-item-active')}>
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                  active ? 'bg-violet-500/20' : 'bg-white/[0.04]'
                )}
              >
                <item.icon className={cn('h-3.5 w-3.5', active ? 'text-violet-400' : 'text-white/40')} />
              </div>
              {item.label}
            </Link>
          );
        })}

        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
          <Initials name={user?.displayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white/85">{user?.displayName || 'User'}</p>
            {user?.storeName && (
              <p className="truncate text-xs text-white/38">{user.storeName}</p>
            )}
          </div>
          {user?.role && (
            <span
              className={cn(
                'badge shrink-0',
                user.role === 'superadmin' ? 'badge-cyan' : user.role === 'owner' ? 'badge-violet' : 'badge-amber'
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
