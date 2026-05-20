import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { RoleGuard } from '@/components/auth/role-guard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleGuard>
        <div className="flex min-h-screen bg-[#060a12]">
          <Sidebar />
          <div className="flex flex-1 flex-col pl-64">
            <TopBar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </RoleGuard>
    </ProtectedRoute>
  );
}
