'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getNavForRole, getRoleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { main, bottom } = getNavForRole(user?.role);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/10 bg-background/95 backdrop-blur-xl">
      <div className="flex h-16 flex-col justify-center px-6">
        <Link href="/dashboard" className="text-lg font-bold gradient-text">
          AutoBot360
        </Link>
        {user?.role && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {getRoleLabel(user.role)}
            {user.storeName ? ` · ${user.storeName}` : ''}
          </p>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {main.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-3 py-4 space-y-1">
        {bottom.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
