import { Router } from 'express';
import { db } from '../../lib/db';
import type { AuthRequest } from '../../middleware/auth';
import { getN8nConnection } from '../orchestration/n8n-service';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const [products, orders, pendingPosts, leads, notifications] = await Promise.all([
      db.query('products', { filters: [{ field: 'tenantId', op: '==', value: tenantId }, { field: 'status', op: '==', value: 'active' }] }),
      db.query('orders', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
      db.query('scheduled_posts', { filters: [{ field: 'tenantId', op: '==', value: tenantId }, { field: 'status', op: '==', value: 'pending' }] }),
      db.query('customers', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
      db.query('notifications', { filters: [{ field: 'userId', op: '==', value: req.user!.uid }], orderBy: { field: 'createdAt', direction: 'desc' }, limit: 10 }),
    ]);

    const revenue = orders.reduce((sum, o) => sum + ((o.total as number) || 0), 0);
    const n8n = await getN8nConnection(tenantId);
    const dbUser = await db.get('users', req.user!.uid);
    const tenant = await db.get('tenants', tenantId);

    res.json({
      user: {
        role: (dbUser?.role as string) || req.user!.role || 'owner',
        displayName: (dbUser?.displayName as string) || req.user!.email?.split('@')[0] || 'User',
        storeName: (dbUser?.storeName as string) || (tenant?.storeName as string) || 'My Store',
        email: (dbUser?.email as string) || req.user!.email,
        tenantId,
      },
      n8n: {
        connected: n8n?.status === 'connected',
        status: n8n?.status || 'disconnected',
        lastTestedAt: n8n?.lastTestedAt,
      },
      kpis: {
        products: products.length,
        orders: orders.length,
        pendingPosts: pendingPosts.length,
        leads: leads.length,
        revenue,
        engagement: 0,
      },
      recentActivity: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
      })),
      recentOrders: orders.slice(0, 5).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});
