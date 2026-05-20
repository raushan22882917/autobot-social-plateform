import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Package,
  Share2,
  Calendar,
  ShoppingCart,
  BarChart3,
  Palette,
  Settings,
  Bell,
  CreditCard,
  TrendingUp,
  Users,
  Building2,
  Shield,
  UserCog,
} from 'lucide-react';

export type AppRole = 'superadmin' | 'owner' | 'admin';

export function normalizeRole(role?: string | null): AppRole {
  if (role === 'superadmin') return 'superadmin';
  if (role === 'owner') return 'owner';
  if (role === 'admin' || role === 'editor' || role === 'viewer') return 'admin';
  return 'owner';
}

export function isSuperAdmin(role?: string | null): boolean {
  return normalizeRole(role) === 'superadmin';
}

export function isOwner(role?: string | null): boolean {
  return normalizeRole(role) === 'owner';
}

export function isTeamAdmin(role?: string | null): boolean {
  return normalizeRole(role) === 'admin';
}

export function canManagePlatform(role?: string | null): boolean {
  return isSuperAdmin(role);
}

export function canManageTeam(role?: string | null): boolean {
  return isOwner(role);
}

export function canEditContent(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'superadmin' || r === 'owner' || r === 'admin';
}

export function canManagePayments(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'superadmin' || r === 'owner';
}

export function canManageN8n(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'superadmin' || r === 'owner';
}

export interface NavItemDef {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: 'platform' | 'main' | 'bottom';
  roles: AppRole[];
}

const NAV_ITEMS: NavItemDef[] = [
  { label: 'Platform', href: '/admin', icon: Shield, section: 'platform', roles: ['superadmin'] },
  { label: 'All users', href: '/admin/users', icon: Users, section: 'platform', roles: ['superadmin'] },
  { label: 'All stores', href: '/admin/tenants', icon: Building2, section: 'platform', roles: ['superadmin'] },

  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'main', roles: ['superadmin', 'owner', 'admin'] },
  { label: 'Products', href: '/products', icon: Package, section: 'main', roles: ['superadmin', 'owner', 'admin'] },
  { label: 'Product Analysis', href: '/product-analysis', icon: TrendingUp, section: 'main', roles: ['superadmin', 'owner', 'admin'] },
  { label: 'Social', href: '/social', icon: Share2, section: 'main', roles: ['superadmin', 'owner', 'admin'] },
  { label: 'Studio', href: '/studio', icon: Palette, section: 'main', roles: ['superadmin', 'owner', 'admin'] },
  { label: 'Posts', href: '/posts', icon: Calendar, section: 'main', roles: ['superadmin', 'owner', 'admin'] },
  { label: 'Orders', href: '/orders', icon: ShoppingCart, section: 'main', roles: ['superadmin', 'owner', 'admin'] },
  { label: 'Payments', href: '/payments', icon: CreditCard, section: 'main', roles: ['superadmin', 'owner'] },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, section: 'main', roles: ['superadmin', 'owner', 'admin'] },
  { label: 'Notifications', href: '/notifications', icon: Bell, section: 'main', roles: ['superadmin', 'owner', 'admin'] },
  { label: 'Team', href: '/team', icon: UserCog, section: 'main', roles: ['owner'] },

  { label: 'Settings', href: '/settings', icon: Settings, section: 'bottom', roles: ['superadmin', 'owner', 'admin'] },
];

export function getNavForRole(role?: string | null): {
  platform: NavItemDef[];
  main: NavItemDef[];
  bottom: NavItemDef[];
} {
  const r = normalizeRole(role);
  const allowed = NAV_ITEMS.filter((item) => item.roles.includes(r));
  return {
    platform: allowed.filter((i) => i.section === 'platform'),
    main: allowed.filter((i) => i.section === 'main'),
    bottom: allowed.filter((i) => i.section === 'bottom'),
  };
}

const ROUTE_ACCESS: Record<string, AppRole[]> = {
  '/admin': ['superadmin'],
  '/admin/users': ['superadmin'],
  '/admin/tenants': ['superadmin'],
  '/dashboard': ['superadmin', 'owner', 'admin'],
  '/products': ['superadmin', 'owner', 'admin'],
  '/product-analysis': ['superadmin', 'owner', 'admin'],
  '/social': ['superadmin', 'owner', 'admin'],
  '/studio': ['superadmin', 'owner', 'admin'],
  '/posts': ['superadmin', 'owner', 'admin'],
  '/orders': ['superadmin', 'owner', 'admin'],
  '/payments': ['superadmin', 'owner'],
  '/analytics': ['superadmin', 'owner', 'admin'],
  '/notifications': ['superadmin', 'owner', 'admin'],
  '/team': ['owner'],
  '/settings': ['superadmin', 'owner', 'admin'],
};

export function canAccessRoute(pathname: string, role?: string | null): boolean {
  const r = normalizeRole(role);
  const base = Object.keys(ROUTE_ACCESS).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (!base) return true;
  return ROUTE_ACCESS[base].includes(r);
}

export function getDefaultRoute(role?: string | null): string {
  return isSuperAdmin(role) ? '/admin' : '/dashboard';
}

export function getRoleLabel(role?: string | null): string {
  const labels: Record<AppRole, string> = {
    superadmin: 'Platform admin',
    owner: 'Store owner',
    admin: 'Team member',
  };
  return labels[normalizeRole(role)];
}
