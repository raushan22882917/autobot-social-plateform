import type { UserRole } from '@autobot360/shared';
import { resolveUserRole } from '../../lib/platform-admin';

export type StoredUser = Record<string, unknown> & {
  uid: string;
  email: string;
  displayName?: string;
  storeName?: string;
  tenantId: string;
  role?: string;
  passwordHash?: string;
  disabled?: boolean;
};

export function normalizeStoredRole(role?: string | null, isNewSignup = false): UserRole {
  if (role === 'superadmin') return 'superadmin';
  if (role === 'owner') return 'owner';
  if (role === 'admin') return 'admin';
  if (isNewSignup) return 'owner';
  if (role === 'editor' || role === 'viewer' || role === 'client') return 'admin';
  return 'owner';
}

export function sanitizeUserForClient(user: StoredUser, options?: { isNewSignup?: boolean }) {
  const firestoreRole = normalizeStoredRole(user.role as string | undefined, options?.isNewSignup);
  const role = resolveUserRole(user.email, firestoreRole) as UserRole;

  return {
    uid: user.uid,
    email: user.email,
    displayName: (user.displayName as string) || user.email?.split('@')[0] || 'User',
    storeName: (user.storeName as string) || 'My Store',
    tenantId: user.tenantId,
    role,
    firestoreRole,
    subscriptionId: user.subscriptionId as string | undefined,
    photoURL: user.photoURL as string | undefined,
    onboardingCompleted: Boolean(user.onboardingCompleted),
    authProvider: user.authProvider as string | undefined,
    createdAt: user.createdAt as string | undefined,
    disabled: Boolean(user.disabled),
  };
}
