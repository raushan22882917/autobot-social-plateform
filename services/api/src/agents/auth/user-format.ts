import type { UserRole } from '@autobot360/shared';

export type StoredUser = Record<string, unknown> & {
  uid: string;
  email: string;
  displayName?: string;
  storeName?: string;
  tenantId: string;
  role?: string;
  passwordHash?: string;
};

/** Map legacy roles → owner | admin */
export function normalizeStoredRole(role?: string | null, isNewSignup = false): UserRole {
  if (role === 'owner') return 'owner';
  if (role === 'admin') return 'admin';
  if (isNewSignup) return 'owner';
  // editor, viewer, client, missing → admin for existing team members
  if (role === 'editor' || role === 'viewer' || role === 'client' || role === 'admin') {
    return 'admin';
  }
  return 'owner';
}

export function sanitizeUserForClient(user: StoredUser, options?: { isNewSignup?: boolean }) {
  const role = normalizeStoredRole(user.role as string | undefined, options?.isNewSignup);
  return {
    uid: user.uid,
    email: user.email,
    displayName: (user.displayName as string) || user.email?.split('@')[0] || 'User',
    storeName: (user.storeName as string) || 'My Store',
    tenantId: user.tenantId,
    role,
    subscriptionId: user.subscriptionId as string | undefined,
    photoURL: user.photoURL as string | undefined,
    onboardingCompleted: Boolean(user.onboardingCompleted),
    authProvider: user.authProvider as string | undefined,
    createdAt: user.createdAt as string | undefined,
  };
}
