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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-instagram text-xs font-bold text-white shadow shadow-brand-instagram/25">
      {s}
    </div>
  );
}

export function TopBar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-white/95 px-6 backdrop-blur-xl">

      <div className="relative w-80 max-w-[50%]">
        <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search products, orders…"
          className="field-input w-full py-2 pl-10 pr-4 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/studio"
          className="hidden items-center gap-1.5 rounded-xl border border-brand-instagram/25 bg-brand-instagram/10 px-3 py-1.5 text-xs font-semibold text-brand-instagram transition hover:bg-brand-instagram/15 hover:border-brand-instagram/40 sm:flex"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Studio
        </Link>

        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-brand-facebook/5 text-muted-foreground transition hover:bg-brand-facebook/10 hover:text-brand-facebook"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-instagram" />
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 items-center gap-2 rounded-xl border border-border bg-brand-facebook/5 pl-2 pr-3 transition hover:bg-brand-facebook/10"
          >
            <Avatar name={user?.displayName} />
            <span className="hidden text-sm font-medium text-foreground md:block">
              {user?.displayName?.split(' ')[0] || 'Account'}
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-brand-facebook/10">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{user?.displayName || 'Seller'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {user?.role && (
                    <span
                      className={cn(
                        'badge mt-2',
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
                <div className="p-2">
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-brand-facebook/5 hover:text-brand-facebook"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      void logout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-brand-youtube transition hover:bg-brand-youtube/10"
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
