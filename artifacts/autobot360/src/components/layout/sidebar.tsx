import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Bot, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getNavForRole, getRoleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';

function Initials({ name }: { name?: string }) {
  const s = (name || 'U').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-sm font-bold text-white shadow-lg shadow-violet-900/40">
      {s}
    </div>
  );
}

export function Sidebar() {
  const [pathname] = useLocation();
  const { user }   = useAuth();
  const { main, bottom } = getNavForRole(user?.role);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/[0.07] bg-[#060a12]/90 backdrop-blur-2xl">

      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-white/[0.06]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 shadow shadow-violet-900/50">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <Link href="/dashboard" className="text-lg font-black gradient-text">AutoBot360</Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {main.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={cn('nav-item', active && 'nav-item-active')}
            >
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                active ? 'bg-violet-500/20' : 'bg-white/[0.04]'
              )}>
                <item.icon className={cn('h-3.5 w-3.5', active ? 'text-violet-400' : 'text-white/40')} />
              </div>
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3 w-3 text-violet-400/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav + user */}
      <div className="border-t border-white/[0.06] px-3 pt-3 pb-2 space-y-0.5">
        {bottom.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={cn('nav-item', active && 'nav-item-active')}
            >
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                active ? 'bg-violet-500/20' : 'bg-white/[0.04]'
              )}>
                <item.icon className={cn('h-3.5 w-3.5', active ? 'text-violet-400' : 'text-white/40')} />
              </div>
              {item.label}
            </Link>
          );
        })}

        {/* User card */}
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
          <Initials name={user?.displayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white/85">{user?.displayName || 'Seller'}</p>
            {user?.storeName && (
              <p className="truncate text-xs text-white/38">{user.storeName}</p>
            )}
          </div>
          {user?.role && (
            <span className="badge badge-violet shrink-0">{user.role}</span>
          )}
        </div>
      </div>
    </aside>
  );
}
