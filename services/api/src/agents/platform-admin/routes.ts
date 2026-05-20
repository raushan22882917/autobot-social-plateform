import { Router } from 'express';
import { db } from '../../lib/db';
import { authMiddleware, requireRole, type AuthRequest } from '../../middleware/auth';
import { sanitizeUserForClient } from '../auth/user-format';
import { syncUserRoleToFirebase } from '../../lib/sync-user-role';
import type { UserRole } from '@autobot360/shared';

export const platformAdminRouter = Router();

platformAdminRouter.use(authMiddleware, requireRole('superadmin'));

platformAdminRouter.get('/stats', async (_req, res, next) => {
  try {
    const users = await db.query('users', { limit: 500 });
    const tenants = await db.query('tenants', { limit: 500 });
    const orders = await db.query('orders', { limit: 500 });

    const byRole = { superadmin: 0, owner: 0, admin: 0, other: 0 };
    for (const u of users) {
      const r = (u.role as string) || 'other';
      if (r in byRole) byRole[r as keyof typeof byRole]++;
      else byRole.other++;
    }

    res.json({
      totalUsers: users.length,
      totalTenants: tenants.length,
      totalOrders: orders.length,
      usersByRole: byRole,
    });
  } catch (err) {
    next(err);
  }
});

platformAdminRouter.get('/users', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').toLowerCase().trim();
    let users = await db.query('users', {
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: 200,
    });

    if (search) {
      users = users.filter(
        (u) =>
          String(u.email || '').toLowerCase().includes(search) ||
          String(u.displayName || '').toLowerCase().includes(search) ||
          String(u.storeName || '').toLowerCase().includes(search)
      );
    }

    res.json({
      users: users.map((u) =>
        sanitizeUserForClient(u as Record<string, unknown>, { isNewSignup: false })
      ),
    });
  } catch (err) {
    next(err);
  }
});

platformAdminRouter.get('/tenants', async (_req, res, next) => {
  try {
    const tenants = await db.query('tenants', {
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: 200,
    });
    const users = await db.query('users', { limit: 500 });

    const enriched = tenants.map((t) => {
      const members = users.filter((u) => u.tenantId === t.tenantId);
      const owner = members.find((u) => u.role === 'owner');
      return {
        tenantId: t.tenantId,
        storeName: t.storeName,
        plan: t.plan,
        status: t.status,
        ownerId: t.ownerId,
        ownerEmail: owner?.email,
        memberCount: members.length,
        createdAt: t.createdAt,
      };
    });

    res.json({ tenants: enriched });
  } catch (err) {
    next(err);
  }
});

platformAdminRouter.patch('/users/:uid/role', async (req: AuthRequest, res, next) => {
  try {
    const { uid } = req.params;
    const { role } = req.body as { role?: string };

    if (!role || !['superadmin', 'owner', 'admin'].includes(role)) {
      return res.status(400).json({ error: { message: 'role must be superadmin, owner, or admin' } });
    }

    if (uid === req.user!.uid && role !== 'superadmin') {
      return res.status(400).json({ error: { message: 'Cannot remove your own superadmin access' } });
    }

    const user = await db.get('users', uid);
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });

    await db.update('users', uid, { role, updatedAt: new Date().toISOString() });
    const updated = await db.get('users', uid);
    const safeUser = sanitizeUserForClient(updated as Record<string, unknown>);

    await syncUserRoleToFirebase(
      uid,
      safeUser.email,
      safeUser.tenantId,
      safeUser.role as UserRole
    );

    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
});

platformAdminRouter.patch('/users/:uid/status', async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { disabled } = req.body as { disabled?: boolean };

    const user = await db.get('users', uid);
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });

    await db.update('users', uid, {
      disabled: Boolean(disabled),
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: disabled ? 'User disabled' : 'User enabled' });
  } catch (err) {
    next(err);
  }
});
