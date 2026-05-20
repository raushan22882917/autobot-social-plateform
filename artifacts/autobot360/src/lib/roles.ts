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
} from 'lucide-react';

/** AutoBot360 supports two roles: owner (store creator) and admin (team + former editor). */
export type AppRole = 'owner' | 'admin';

export function normalizeRole(role?: string | null): AppRole {
  if (role === 'owner') return 'owner';
  // editor, viewer, client, admin → admin
  return 'admin';
}

export function isOwner(role?: string | null): boolean {
  return normalizeRole(role) === 'owner';
}

export function isAdmin(role?: string | null): boolean {
  return normalizeRole(role) === 'admin';
}

/** n8n connect / disconnect */
export function canManageN8n(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'owner' || r === 'admin';
}

/** Products, posts, social — owner & admin */
export function canEditContent(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'owner' || r === 'admin';
}

export interface NavItemDef {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: 'main' | 'bottom';
}

const ALL_NAV: NavItemDef[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Product Analysis', href: '/product-analysis', icon: TrendingUp },
  { label: 'Social', href: '/social', icon: Share2 },
  { label: 'Studio', href: '/studio', icon: Palette },
  { label: 'Posts', href: '/posts', icon: Calendar },
  { label: 'Orders', href: '/orders', icon: ShoppingCart },
  { label: 'Payments', href: '/payments', icon: CreditCard },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings, section: 'bottom' },
];

/** Owner and admin see the same navigation */
export function getNavForRole(_role?: string | null): { main: NavItemDef[]; bottom: NavItemDef[] } {
  return {
    main: ALL_NAV.filter((item) => item.section !== 'bottom'),
    bottom: ALL_NAV.filter((item) => item.section === 'bottom'),
  };
}

const ALL_ROUTES = ALL_NAV.map((item) => item.href);

export function canAccessRoute(pathname: string, role?: string | null): boolean {
  normalizeRole(role);
  const base = ALL_ROUTES.find((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (!base) return true;
  return true;
}

export function getRoleLabel(role?: string | null): string {
  return normalizeRole(role) === 'owner' ? 'Owner' : 'Admin';
}
