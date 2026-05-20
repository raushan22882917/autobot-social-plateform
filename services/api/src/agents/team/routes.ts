import { Router } from 'express';
import { syncUserRoleToFirebase } from '../../lib/sync-user-role';
import type { UserRole } from '@autobot360/shared';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { authMiddleware, requireRole, type AuthRequest } from '../../middleware/auth';
import { publishEvent } from '../../lib/pubsub';

export const teamRouter = Router();

// POST /api/v1/team/invite - Send team invite
teamRouter.post('/invite', authMiddleware, requireRole('owner'), async (req: AuthRequest, res, next) => {
  try {
    const { email, role } = req.body;
    const tenantId = req.user!.tenantId;

    if (!email || !role) {
      return res.status(400).json({ error: { message: 'email and role required' } });
    }

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: { message: 'Invalid role' } });
    }

    // Check if user already exists in tenant
    const existingUsers = await db.query('users', {
      filters: [
        { field: 'tenantId', op: '==', value: tenantId },
        { field: 'email', op: '==', value: email },
      ],
    });

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: { message: 'User already in team' } });
    }

    // Create invite
    const inviteId = `invite_${uuidv4().slice(0, 8)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.set('team_invites', inviteId, {
      id: inviteId,
      tenantId,
      email,
      role,
      invitedBy: req.user!.uid,
      invitedByEmail: req.user!.email,
      status: 'pending',
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Publish event for email sending
    await publishEvent('team.invite_sent', {
      tenantId,
      inviteId,
      email,
      role,
      invitedBy: req.user!.email,
    });

    res.status(201).json({
      inviteId,
      email,
      role,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/team/invites - List pending invites
teamRouter.get('/invites', authMiddleware, requireRole('owner'), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const invites = await db.query('team_invites', {
      filters: [
        { field: 'tenantId', op: '==', value: tenantId },
        { field: 'status', op: '==', value: 'pending' },
      ],
      orderBy: { field: 'createdAt', direction: 'desc' },
    });

    res.json({ invites });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/team/invites/:inviteId/accept - Accept team invite
teamRouter.post('/invites/:inviteId/accept', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user!.uid;
    const email = req.user!.email;

    const invite = await db.get('team_invites', inviteId);

    if (!invite) {
      return res.status(404).json({ error: { message: 'Invite not found' } });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: { message: 'Invite already used' } });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return res.status(400).json({ error: { message: 'Invite expired' } });
    }

    if (invite.email !== email) {
      return res.status(400).json({ error: { message: 'Invite email does not match' } });
    }

    // Update user with tenant and role
    await db.update('users', userId, {
      tenantId: invite.tenantId,
      role: invite.role,
    });

    // Mark invite as accepted
    await db.update('team_invites', inviteId, {
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    });

    // Publish event
    await publishEvent('team.invite_accepted', {
      tenantId: invite.tenantId,
      inviteId,
      userId,
      email,
      role: invite.role,
    });

    res.json({ message: 'Invite accepted' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/team/invites/:inviteId - Cancel invite
teamRouter.delete('/invites/:inviteId', authMiddleware, requireRole('owner'), async (req: AuthRequest, res, next) => {
  try {
    const { inviteId } = req.params;
    const tenantId = req.user!.tenantId;

    const invite = await db.get('team_invites', inviteId);

    if (!invite || invite.tenantId !== tenantId) {
      return res.status(404).json({ error: { message: 'Invite not found' } });
    }

    await db.delete('team_invites', inviteId);

    res.json({ message: 'Invite cancelled' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/team/members - List team members
teamRouter.get('/members', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const members = await db.query('users', {
      filters: [{ field: 'tenantId', op: '==', value: tenantId }],
      orderBy: { field: 'createdAt', direction: 'asc' },
    });

    res.json({
      members: members.map(m => ({
        uid: m.uid,
        email: m.email,
        displayName: m.displayName,
        role: m.role,
        createdAt: m.createdAt,
        lastLoginAt: m.lastLoginAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/team/members/:userId/role - Change member role
teamRouter.put('/members/:userId/role', authMiddleware, requireRole('owner'), async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const tenantId = req.user!.tenantId;

    if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: { message: 'Invalid role' } });
    }

    const member = await db.get('users', userId);

    if (!member || member.tenantId !== tenantId) {
      return res.status(404).json({ error: { message: 'Member not found' } });
    }

    // Prevent removing last owner
    if (member.role === 'owner' && role !== 'owner') {
      const owners = await db.query('users', {
        filters: [
          { field: 'tenantId', op: '==', value: tenantId },
          { field: 'role', op: '==', value: 'owner' },
        ],
      });

      if (owners.length === 1) {
        return res.status(400).json({ error: { message: 'Cannot remove last owner' } });
      }
    }

    const storedRole: UserRole =
      role === 'admin' || role === 'editor' || role === 'viewer' ? 'admin' : 'owner';
    await db.update('users', userId, { role: storedRole });

    await syncUserRoleToFirebase(
      userId,
      member.email as string,
      tenantId,
      storedRole
    );

    // Publish event
    await publishEvent('team.member_role_changed', {
      tenantId,
      userId,
      newRole: role,
      changedBy: req.user!.uid,
    });

    res.json({ message: 'Role updated' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/team/members/:userId - Remove team member
teamRouter.delete('/members/:userId', authMiddleware, requireRole('owner'), async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user!.tenantId;

    if (userId === req.user!.uid) {
      return res.status(400).json({ error: { message: 'Cannot remove yourself' } });
    }

    const member = await db.get('users', userId);

    if (!member || member.tenantId !== tenantId) {
      return res.status(404).json({ error: { message: 'Member not found' } });
    }

    // Prevent removing last owner
    if (member.role === 'owner') {
      const owners = await db.query('users', {
        filters: [
          { field: 'tenantId', op: '==', value: tenantId },
          { field: 'role', op: '==', value: 'owner' },
        ],
      });

      if (owners.length === 1) {
        return res.status(400).json({ error: { message: 'Cannot remove last owner' } });
      }
    }

    // Remove tenant from user
    await db.update('users', userId, { tenantId: null, role: null });

    // Publish event
    await publishEvent('team.member_removed', {
      tenantId,
      userId,
      removedBy: req.user!.uid,
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/team/stats - Get team statistics
teamRouter.get('/stats', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const members = await db.query('users', {
      filters: [{ field: 'tenantId', op: '==', value: tenantId }],
    });

    const invites = await db.query('team_invites', {
      filters: [
        { field: 'tenantId', op: '==', value: tenantId },
        { field: 'status', op: '==', value: 'pending' },
      ],
    });

    const roleCount = {
      owner: members.filter(m => m.role === 'owner').length,
      admin: members.filter(m => m.role === 'admin').length,
      editor: members.filter(m => m.role === 'editor').length,
      viewer: members.filter(m => m.role === 'viewer').length,
    };

    res.json({
      totalMembers: members.length,
      pendingInvites: invites.length,
      roleCount,
    });
  } catch (err) {
    next(err);
  }
});
