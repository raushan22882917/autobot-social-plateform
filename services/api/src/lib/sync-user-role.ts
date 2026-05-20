import type { UserRole } from '@autobot360/shared';
import { db } from './db';
import { getFirebaseAuth } from './firebase-admin';
import { resolveUserRole } from './platform-admin';
import { normalizeStoredRole, type StoredUser } from '../agents/auth/user-format';

/** Effective role for API + UI (Firestore role + platform admin email rules). */
export function resolveEffectiveRole(user: StoredUser, isNewSignup = false): UserRole {
  return resolveUserRole(
    user.email,
    normalizeStoredRole(user.role as string | undefined, isNewSignup)
  ) as UserRole;
}

/** Raw role field stored in Firestore `users` collection. */
export function getFirestoreRole(user: StoredUser): UserRole {
  return normalizeStoredRole(user.role as string | undefined, false);
}

export async function syncFirestoreUserRole(uid: string, role: UserRole): Promise<void> {
  const existing = await db.get('users', uid);
  if (!existing || existing.role === role) return;
  await db.update('users', uid, {
    role,
    updatedAt: new Date().toISOString(),
  });
}

/** Mirror role into Firebase Auth custom claims (for ID token). */
export async function syncFirebaseAuthClaims(
  uid: string,
  claims: { role: UserRole; tenantId: string }
): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;

  try {
    await auth.setCustomUserClaims(uid, claims);
  } catch (err) {
    console.warn(
      'Firebase custom claims sync failed:',
      err instanceof Error ? err.message : err
    );
  }
}

export async function syncUserRoleToFirebase(
  uid: string,
  email: string,
  tenantId: string,
  effectiveRole: UserRole
): Promise<void> {
  await syncFirestoreUserRole(uid, effectiveRole);
  await syncFirebaseAuthClaims(uid, { role: effectiveRole, tenantId });
}

export async function loadAuthUserFromFirestore(uid: string): Promise<{
  effectiveRole: UserRole;
  firestoreRole: UserRole;
  email: string;
  tenantId: string;
  plan: string;
} | null> {
  const user = (await db.get('users', uid)) as StoredUser | null;
  if (!user) return null;

  const firestoreRole = getFirestoreRole(user);
  const effectiveRole = resolveEffectiveRole(user);

  if (user.role !== effectiveRole) {
    await syncFirestoreUserRole(uid, effectiveRole);
  }

  const sub = await db.get('subscriptions', user.tenantId as string);
  const plan = (sub?.plan as string) || 'free';

  return {
    effectiveRole,
    firestoreRole,
    email: user.email,
    tenantId: user.tenantId as string,
    plan,
  };
}
