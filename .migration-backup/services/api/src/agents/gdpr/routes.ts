import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { authMiddleware, type AuthRequest } from '../../middleware/auth';
import { publishEvent } from '../../lib/pubsub';

export const gdprRouter = Router();

// POST /api/v1/gdpr/export - Export all user data
gdprRouter.post('/export', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.uid;

    // Collect all tenant data
    const [users, products, orders, payments, posts, comments, socialAccounts, scheduledPosts, notifications] = await Promise.all([
      db.query('users', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
      db.query('products', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
      db.query('orders', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
      db.query('payments', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
      db.query('social_posts', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
      db.query('comments', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
      db.query('social_accounts', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
      db.query('scheduled_posts', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
      db.query('notifications', { filters: [{ field: 'userId', op: '==', value: userId }] }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      tenantId,
      userId,
      data: {
        users,
        products,
        orders,
        payments,
        posts,
        comments,
        socialAccounts,
        scheduledPosts,
        notifications,
      },
    };

    // Create export record
    const exportId = `export_${uuidv4().slice(0, 8)}`;
    await db.set('gdpr_exports', exportId, {
      id: exportId,
      tenantId,
      userId,
      status: 'completed',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    // Log audit event
    await publishEvent('gdpr.export', {
      tenantId,
      userId,
      exportId,
      timestamp: new Date().toISOString(),
    });

    // Return JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="autobot360-export-${tenantId}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/gdpr/delete - Request account deletion
gdprRouter.post('/delete', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.uid;
    const { confirmEmail } = req.body;

    // Verify email confirmation
    if (confirmEmail !== req.user!.email) {
      return res.status(400).json({
        error: { message: 'Email confirmation does not match' },
      });
    }

    // Create deletion request
    const deletionId = `deletion_${uuidv4().slice(0, 8)}`;
    const deletionDelay = 30 * 24 * 60 * 60 * 1000; // 30 days

    await db.set('gdpr_deletions', deletionId, {
      id: deletionId,
      tenantId,
      userId,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      scheduledFor: new Date(Date.now() + deletionDelay).toISOString(),
      canCancelUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    // Log audit event
    await publishEvent('gdpr.deletion_requested', {
      tenantId,
      userId,
      deletionId,
      scheduledFor: new Date(Date.now() + deletionDelay).toISOString(),
    });

    res.json({
      message: 'Deletion request submitted',
      deletionId,
      scheduledFor: new Date(Date.now() + deletionDelay).toISOString(),
      canCancelUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/gdpr/delete/cancel - Cancel deletion request
gdprRouter.post('/delete/cancel', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { deletionId } = req.body;
    const tenantId = req.user!.tenantId;

    const deletion = await db.get('gdpr_deletions', deletionId);

    if (!deletion || deletion.tenantId !== tenantId) {
      return res.status(404).json({ error: { message: 'Deletion request not found' } });
    }

    if (deletion.status !== 'pending') {
      return res.status(400).json({ error: { message: 'Deletion request cannot be cancelled' } });
    }

    if (new Date() > new Date(deletion.canCancelUntil)) {
      return res.status(400).json({ error: { message: 'Cancellation period has expired' } });
    }

    await db.update('gdpr_deletions', deletionId, { status: 'cancelled' });

    await publishEvent('gdpr.deletion_cancelled', {
      tenantId,
      deletionId,
    });

    res.json({ message: 'Deletion request cancelled' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/gdpr/deletion-status - Get deletion request status
gdprRouter.get('/deletion-status', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const deletions = await db.query('gdpr_deletions', {
      filters: [
        { field: 'tenantId', op: '==', value: tenantId },
        { field: 'status', op: '==', value: 'pending' },
      ],
    });

    if (deletions.length === 0) {
      return res.json({ hasPendingDeletion: false });
    }

    const deletion = deletions[0];

    res.json({
      hasPendingDeletion: true,
      deletionId: deletion.id,
      scheduledFor: deletion.scheduledFor,
      canCancelUntil: deletion.canCancelUntil,
      daysUntilDeletion: Math.ceil((new Date(deletion.scheduledFor).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    });
  } catch (err) {
    next(err);
  }
});

// Internal: Process scheduled deletions (run via Cloud Scheduler)
gdprRouter.post('/process-deletions', async (req, res, next) => {
  try {
    // Verify internal request
    const internalKey = req.get('X-Internal-Key');
    if (internalKey !== process.env.INTERNAL_API_KEY) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const now = new Date();
    const deletions = await db.query('gdpr_deletions', {
      filters: [{ field: 'status', op: '==', value: 'pending' }],
    });

    let processed = 0;

    for (const deletion of deletions) {
      if (new Date(deletion.scheduledFor) <= now) {
        // Perform cascade delete
        const collections = [
          'users',
          'products',
          'orders',
          'payments',
          'social_posts',
          'comments',
          'social_accounts',
          'scheduled_posts',
          'notifications',
          'subscriptions',
          'audit_logs',
        ];

        for (const collection of collections) {
          const docs = await db.query(collection, {
            filters: [{ field: 'tenantId', op: '==', value: deletion.tenantId }],
          });

          for (const doc of docs) {
            await db.delete(collection, doc.id);
          }
        }

        // Mark deletion as completed
        await db.update('gdpr_deletions', deletion.id, { status: 'completed' });

        // Log audit event
        await publishEvent('gdpr.deletion_completed', {
          tenantId: deletion.tenantId,
          deletionId: deletion.id,
          completedAt: new Date().toISOString(),
        });

        processed++;
      }
    }

    res.json({ message: `Processed ${processed} deletions` });
  } catch (err) {
    next(err);
  }
});
