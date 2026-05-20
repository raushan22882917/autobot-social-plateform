import { Router } from 'express';
import type { AuthRequest } from '../../middleware/auth';

export const analyticsRouter = Router();

analyticsRouter.get('/overview', async (req: AuthRequest, res) => {
  res.json({
    revenue: { total: 0, change: 0 },
    orders: { total: 0, change: 0 },
    leads: { total: 0, change: 0 },
    engagement: { total: 0, change: 0 },
    conversionRate: 0,
    chartData: [],
    period: req.query.period || '30d',
  });
});
