import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, getStorageMode, isDevStore } from '../../lib/db';
import { publishEvent } from '../../lib/pubsub';
import { signToken, authMiddleware, AuthRequest } from '../../middleware/auth';
import { PubSubTopics } from '@autobot360/shared';
import { isFirebaseAdminEnabled } from '../../lib/firebase-admin';
import { verifyFirebaseIdToken } from '../../lib/verify-firebase-token';
import { provisionUserFromFirebase } from './firebase-user';
import { sanitizeUserForClient, type StoredUser } from './user-format';
import { getGoogleOAuthSetup } from '../../lib/google-oauth-setup';

export const authRouter = Router();

/**
 * Firebase Auth flow:
 * 1. Client signs in with Firebase (email/password or Google)
 * 2. Client sends idToken to this endpoint
 * 3. Server verifies token, provisions user in Firestore/memory, returns API JWT
 */
authRouter.post('/firebase', async (req, res, next) => {
  try {
    const { idToken, displayName, storeName } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: { message: 'idToken is required' } });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const result = await provisionUserFromFirebase(decoded, { displayName, storeName });
    res.status(result.isNewUser ? 201 : 200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid Firebase token';
    if (message.includes('not configured') || message.includes('FIREBASE_WEB_API_KEY')) {
      return res.status(503).json({
        error: { message, code: 'FIREBASE_NOT_CONFIGURED' },
      });
    }
    if (message.includes('expired') || message.includes('id-token') || message.includes('Invalid')) {
      return res.status(401).json({ error: { message: 'Invalid or expired Firebase token' } });
    }
    next(err);
  }
});

authRouter.get('/config', (_req, res) => {
  const devTokenVerify = isDevStore() && Boolean(process.env.FIREBASE_WEB_API_KEY);
  res.json({
    mode: isFirebaseAdminEnabled() ? 'firebase' : devTokenVerify ? 'firebase-dev' : isDevStore() ? 'dev' : 'production',
    storage: getStorageMode(),
    firebaseAdmin: isFirebaseAdminEnabled(),
    firebaseDevVerify: devTokenVerify,
    devStore: isDevStore(),
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID,
    googleOAuth: getGoogleOAuthSetup(),
  });
});

// ─── Dev-only email/password (when Firebase client not configured) ───

authRouter.post('/signup', async (req, res, next) => {
  try {
    const { email, password, displayName, storeName } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: { message: 'Email and password (min 6 chars) required' } });
    }
    if (!storeName?.trim()) {
      return res.status(400).json({ error: { message: 'Store name is required' } });
    }

    const existing = await db.query('users', { filters: [{ field: 'email', op: '==', value: email }] });
    if (existing.length > 0) {
      return res.status(409).json({ error: { message: 'Email already registered' } });
    }

    const uid = `user_${uuidv4().slice(0, 8)}`;
    const tenantId = `tenant_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password, 10);

    const user: StoredUser = {
      uid,
      email,
      displayName: displayName?.trim() || email.split('@')[0],
      storeName: storeName.trim(),
      tenantId,
      role: 'owner',
      subscriptionId: tenantId,
      authProvider: 'dev',
      passwordHash,
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.set('users', uid, user);
    await db.set('tenants', tenantId, {
      tenantId,
      storeName: user.storeName,
      ownerId: uid,
      plan: 'free',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    await db.set('subscriptions', tenantId, {
      tenantId,
      plan: 'free',
      status: 'active',
      limits: { products: 10, scheduledPosts: 20, socialAccounts: 2, aiRepliesPerMonth: 100, teamMembers: 1 },
      usage: { products: 0, scheduledPosts: 0, aiReplies: 0 },
      createdAt: now,
    });

    await publishEvent(PubSubTopics.TENANT_CREATED, {
      eventType: 'tenant.created',
      tenantId,
      userId: uid,
      idempotencyKey: `tenant_${tenantId}`,
      payload: { tenantId, userId: uid, storeName: user.storeName },
      metadata: { source: 'auth-agent' },
    });

    const safeUser = sanitizeUserForClient(user, { isNewSignup: true });
    const token = signToken({
      uid,
      tenantId,
      role: safeUser.role,
      plan: 'free',
      email,
    });
    res.status(201).json({ user: safeUser, token, expiresIn: 86400 });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password required' } });
    }

    const users = await db.query('users', { filters: [{ field: 'email', op: '==', value: email }] });
    const user = users[0];
    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        error: {
          message: 'This account uses Firebase sign-in. Please use Google or email via Firebase.',
          code: 'FIREBASE_ACCOUNT',
        },
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash as string);
    if (!valid) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    const sub = await db.get('subscriptions', user.tenantId as string);
    const plan = (sub?.plan as string) || 'free';

    await db.update('users', user.uid as string, { lastLoginAt: new Date().toISOString() });

    const safeUser = sanitizeUserForClient(user as StoredUser);
    const token = signToken({
      uid: safeUser.uid,
      tenantId: safeUser.tenantId,
      role: safeUser.role,
      plan,
      email: safeUser.email,
    });

    res.json({ user: safeUser, token, expiresIn: 86400 });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await db.get('users', req.user!.uid);
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });
    const safeUser = sanitizeUserForClient(user as StoredUser);
    res.json({ user: safeUser, tenant: await db.get('tenants', safeUser.tenantId) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', authMiddleware, (req: AuthRequest, res) => {
  const token = signToken(req.user!);
  res.json({ token, expiresIn: 86400 });
});
