import { v4 as uuidv4 } from 'uuid';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../../lib/db';
import { publishEvent } from '../../lib/pubsub';
import { signToken } from '../../middleware/auth';
import { PubSubTopics } from '@autobot360/shared';
import { sanitizeUserForClient, normalizeStoredRole, type StoredUser } from './user-format';
import { syncUserRoleToFirebase } from '../../lib/sync-user-role';

export interface FirebaseAuthExtras {
  displayName?: string;
  storeName?: string;
}

async function ensureTenantRecord(tenantId: string, storeName: string, ownerId: string) {
  const now = new Date().toISOString();
  const existing = await db.get('tenants', tenantId);
  if (!existing) {
    await db.set('tenants', tenantId, {
      tenantId,
      storeName,
      ownerId,
      plan: 'free',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function provisionUserFromFirebase(
  decoded: DecodedIdToken,
  extras: FirebaseAuthExtras = {}
) {
  const uid = decoded.uid;
  const email = decoded.email || '';
  const now = new Date().toISOString();

  let user = (await db.get('users', uid)) as StoredUser | null;
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const tenantId = `tenant_${uuidv4().slice(0, 8)}`;
    const storeName = extras.storeName?.trim() || extras.displayName?.trim() || 'My Store';

    user = {
      uid,
      email,
      displayName: extras.displayName?.trim() || decoded.name || email.split('@')[0] || 'User',
      photoURL: decoded.picture || '',
      storeName,
      tenantId,
      role: 'owner',
      subscriptionId: tenantId,
      authProvider: decoded.firebase?.sign_in_provider || 'password',
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.set('users', uid, user);
    await db.set('subscriptions', tenantId, {
      tenantId,
      plan: 'free',
      status: 'active',
      limits: {
        products: 10,
        scheduledPosts: 20,
        socialAccounts: 2,
        aiRepliesPerMonth: 100,
        teamMembers: 1,
      },
      usage: { products: 0, scheduledPosts: 0, aiReplies: 0 },
      createdAt: now,
    });
    await ensureTenantRecord(tenantId, storeName, uid);

    await publishEvent(PubSubTopics.TENANT_CREATED, {
      eventType: 'tenant.created',
      tenantId,
      userId: uid,
      idempotencyKey: `tenant_${tenantId}`,
      payload: { tenantId, userId: uid, storeName },
      metadata: { source: 'auth-agent', provider: 'firebase' },
    });
  } else {
    const claimRole =
      typeof (decoded as Record<string, unknown>).role === 'string'
        ? ((decoded as Record<string, unknown>).role as string)
        : undefined;

    const updates: Record<string, unknown> = {
      lastLoginAt: now,
      updatedAt: now,
    };

    if (!user.role && claimRole) {
      updates.role = normalizeStoredRole(claimRole);
    } else if (!user.role) {
      updates.role = 'owner';
    }
    if (extras.storeName?.trim() && (!user.storeName || user.storeName === 'My Store')) {
      updates.storeName = extras.storeName.trim();
    }
    if (extras.displayName?.trim() && !user.displayName) {
      updates.displayName = extras.displayName.trim();
    }
    if (decoded.picture && !user.photoURL) updates.photoURL = decoded.picture;

    if (Object.keys(updates).length > 2) {
      await db.update('users', uid, updates);
      user = (await db.get('users', uid)) as StoredUser;
    }

    await ensureTenantRecord(
      user!.tenantId as string,
      (user!.storeName as string) || extras.storeName || 'My Store',
      uid
    );
  }

  const safeUser = sanitizeUserForClient(user!, { isNewSignup: isNewUser });
  await syncUserRoleToFirebase(uid, safeUser.email, safeUser.tenantId, safeUser.role);

  const sub = await db.get('subscriptions', safeUser.tenantId);
  const plan = (sub?.plan as string) || 'free';

  const token = signToken({
    uid,
    tenantId: safeUser.tenantId,
    role: safeUser.role,
    plan,
    email,
  });

  return {
    user: safeUser,
    token,
    expiresIn: 86400,
    isNewUser,
  };
}
