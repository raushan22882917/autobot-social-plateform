import { Router } from 'express';
import { db } from '../../lib/db';
import { authMiddleware, requireRole, type AuthRequest } from '../../middleware/auth';

export const auditRouter = Router();

// GET /api/v1/audit-logs - List audit logs with filters
auditRouter.get('/', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const { resource, startDate, endDate, userId, status, limit = 100, offset = 0 } = req.query;

    const filters: any[] = [
      { field: 'tenantId', op: '==', value: req.user!.tenantId },
    ];

    if (resource) {
      filters.push({ field: 'resource', op: '==', value: resource });
    }

    if (userId) {
      filters.push({ field: 'userId', op: '==', value: userId });
    }

    if (status) {
      filters.push({ field: 'status', op: '==', value: status });
    }

    if (startDate) {
      filters.push({ field: 'timestamp', op: '>=', value: new Date(startDate as string).toISOString() });
    }

    if (endDate) {
      filters.push({ field: 'timestamp', op: '<=', value: new Date(endDate as string).toISOString() });
    }

    const logs = await db.query('audit_logs', {
      filters,
      orderBy: { field: 'timestamp', direction: 'desc' },
      limit: Math.min(parseInt(limit as string) || 100, 1000),
      offset: parseInt(offset as string) || 0,
    });

    const total = await db.query('audit_logs', {
      filters,
      limit: 1,
    });

    res.json({ logs, total: total.length, limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/audit-logs/:id - Get specific audit log
auditRouter.get('/:id', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const log = await db.get('audit_logs', req.params.id);

    if (!log || log.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: { message: 'Audit log not found' } });
    }

    res.json(log);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/audit-logs/user/:userId - Get user's audit trail
auditRouter.get('/user/:userId', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const logs = await db.query('audit_logs', {
      filters: [
        { field: 'tenantId', op: '==', value: req.user!.tenantId },
        { field: 'userId', op: '==', value: req.params.userId },
      ],
      orderBy: { field: 'timestamp', direction: 'desc' },
      limit: 100,
    });

    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/audit-logs/resource/:resource/:resourceId - Get resource audit trail
auditRouter.get('/resource/:resource/:resourceId', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const logs = await db.query('audit_logs', {
      filters: [
        { field: 'tenantId', op: '==', value: req.user!.tenantId },
        { field: 'resource', op: '==', value: req.params.resource },
        { field: 'resourceId', op: '==', value: req.params.resourceId },
      ],
      orderBy: { field: 'timestamp', direction: 'desc' },
      limit: 100,
    });

    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/audit-logs/export - Export audit logs as CSV
auditRouter.post('/export', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, resource, format = 'csv' } = req.body;

    const filters: any[] = [
      { field: 'tenantId', op: '==', value: req.user!.tenantId },
    ];

    if (startDate) filters.push({ field: 'timestamp', op: '>=', value: new Date(startDate).toISOString() });
    if (endDate) filters.push({ field: 'timestamp', op: '<=', value: new Date(endDate).toISOString() });
    if (resource) filters.push({ field: 'resource', op: '==', value: resource });

    const logs = await db.query('audit_logs', {
      filters,
      orderBy: { field: 'timestamp', direction: 'desc' },
      limit: 10000,
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
      res.send(JSON.stringify(logs, null, 2));
    } else {
      // CSV format
      const csv = [
        ['Timestamp', 'User', 'Email', 'Action', 'Resource', 'Resource ID', 'Status', 'Status Code', 'IP Address', 'Duration (ms)'].join(','),
        ...logs.map(log => [
          log.timestamp,
          log.userId,
          log.userEmail,
          log.action,
          log.resource,
          log.resourceId,
          log.status,
          log.statusCode,
          log.ipAddress,
          log.duration,
        ].map(v => `"${v}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
      res.send(csv);
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/audit-logs/stats/summary - Get audit log statistics
auditRouter.get('/stats/summary', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const logs = await db.query('audit_logs', {
      filters: [
        { field: 'tenantId', op: '==', value: req.user!.tenantId },
      ],
      limit: 10000,
    });

    const stats = {
      total: logs.length,
      byStatus: {
        success: logs.filter(l => l.status === 'success').length,
        failure: logs.filter(l => l.status === 'failure').length,
      },
      byResource: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      avgDuration: logs.length > 0 ? logs.reduce((sum, l) => sum + l.duration, 0) / logs.length : 0,
    };

    logs.forEach(log => {
      stats.byResource[log.resource] = (stats.byResource[log.resource] || 0) + 1;
      stats.byUser[log.userEmail] = (stats.byUser[log.userEmail] || 0) + 1;
    });

    res.json(stats);
  } catch (err) {
    next(err);
  }
});
