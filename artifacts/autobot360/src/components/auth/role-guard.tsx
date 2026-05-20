import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { canAccessRoute } from '@/lib/roles';

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [pathname, setLocation] = useLocation();

  useEffect(() => {
    if (loading || !user) return;
    if (!canAccessRoute(pathname, user.role)) {
      setLocation('/dashboard?access=denied');
    }
  }, [loading, user, pathname, setLocation]);

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
