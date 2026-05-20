'use client';

import { Bell, Search, Sparkles, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getRoleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { useState } from 'react';

function Avatar({ name }: { name?: string }) {
  const s = (name || 'U').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-xs font-bold text-white shadow shadow-violet-900/40">
      {s}
    </div>
  );
}

export function TopBar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/[0.07] bg-[#060a12]/80 px-6 backdrop-blur-2xl">

      {/* Search */}
      <div className="relative w-80 max-w-[50%]">
        <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <input
          type="search"
          placeholder="Search products, orders…"
          className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] py-2 pl-10 pr-4 text-sm text-white/80 placeholder:text-white/28 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet-500/15"
        />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* AI Assistant pill */}
        <Link href="/assistant"
          className="hidden items-center gap-1.5 rounded-xl border border-violet-500/25 bg-violet-500/12 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20 hover:border-violet-500/40 sm:flex"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Assistant
        </Link>

        {/* Notifications */}
        <Link href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.04] text-white/55 transition hover:bg-white/[0.08] hover:text-white/85"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-500" />
        </Link>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] pl-2 pr-3 transition hover:bg-white/[0.08]"
          >
            <Avatar name={user?.displayName} />
            <span className="hidden text-sm font-medium text-white/70 md:block">
              {user?.displayName?.split(' ')[0] || 'Account'}
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/12 bg-[#0d1120] shadow-2xl shadow-black/60 backdrop-blur-xl">
                <div className="border-b border-white/[0.07] px-4 py-3">
                  <p className="text-sm font-semibold text-white">{user?.displayName || 'Seller'}</p>
                  <p className="text-xs text-white/40">{user?.email}</p>
                  {user?.role && (
                    <span
                      className={cn(
                        'badge mt-2',
                        user.role === 'superadmin'
                          ? 'badge-cyan'
                          : user.role === 'owner'
                            ? 'badge-violet'
                            : 'badge-amber'
                      )}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <Link href="/settings" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); void logout(); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
