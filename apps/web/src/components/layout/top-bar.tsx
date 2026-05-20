'use client';

import { Bell, Search, Sparkles, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

export function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-background/80 px-6 backdrop-blur-xl">
      <div className="relative w-96 max-w-[40%]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search products, orders..."
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        />
      </div>
      <div className="flex items-center gap-3">
        <Link href="/assistant" className="hidden items-center gap-2 rounded-xl bg-violet-500/20 px-3 py-2 text-sm text-violet-300 hover:bg-violet-500/30 sm:flex">
          <Sparkles className="h-4 w-4" />
          AI Assistant
        </Link>
        <Link href="/notifications" className="relative rounded-xl p-2 hover:bg-white/5">
          <Bell className="h-5 w-5" />
        </Link>
        <span className="hidden text-sm text-muted-foreground md:block">{user?.displayName}</span>
        <Button variant="ghost" size="sm" onClick={() => void logout()}><LogOut className="h-4 w-4" /></Button>
      </div>
    </header>
  );
}
