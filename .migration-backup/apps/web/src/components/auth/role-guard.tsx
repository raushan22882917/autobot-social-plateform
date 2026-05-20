'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { canAccessRoute } from '@/lib/roles';

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (!canAccessRoute(pathname, user.role)) {
      router.replace('/dashboard?access=denied');
    }
  }, [loading, user, pathname, router]);

  if (loading) return null;
  if (user && !canAccessRoute(pathname, user.role)) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
