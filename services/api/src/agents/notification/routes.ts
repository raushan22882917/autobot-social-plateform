import { Router } from 'express';
import { db } from '../../lib/db';
import type { AuthRequest } from '../../middleware/auth';

export const notificationRouter = Router();

notificationRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const notifications = await db.query('notifications', {
      filters: [{ field: 'userId', op: '==', value: req.user!.uid }],
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: 30,
    });
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

notificationRouter.patch('/:id/read', async (req: AuthRequest, res, next) => {
  try {
    const doc = await db.get('notifications', req.params.id);
    if (!doc || doc.userId !== req.user!.uid) {
      return res.status(404).json({ error: { message: 'Notification not found' } });
    }
    await db.update('notifications', req.params.id, { read: true, updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
