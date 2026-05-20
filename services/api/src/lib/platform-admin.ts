/** Platform-level superadmin (manages all tenants/users). */
export function getPlatformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getPlatformAdminEmails().includes(email.toLowerCase());
}

export function resolveUserRole(email: string, storedRole?: string | null): string {
  if (isPlatformAdminEmail(email)) return 'superadmin';
  if (storedRole === 'superadmin') return 'superadmin';
  if (storedRole === 'owner') return 'owner';
  if (storedRole === 'admin' || storedRole === 'editor' || storedRole === 'viewer') return 'admin';
  return storedRole || 'owner';
}

export function isSuperAdminRole(role?: string | null): boolean {
  return role === 'superadmin';
}
