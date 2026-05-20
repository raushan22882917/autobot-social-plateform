import { Response, NextFunction } from 'express';
import { db } from '../lib/db';
import type { AuthRequest } from './auth';

export const PLAN_LIMITS = {
  free: {
    products: 10,
    scheduledPosts: 5,
    socialAccounts: 1,
    aiRepliesPerMonth: 10,
    teamMembers: 1,
    apiKeys: 0,
  },
  starter: {
    products: 100,
    scheduledPosts: 50,
    socialAccounts: 3,
    aiRepliesPerMonth: 500,
    teamMembers: 3,
    apiKeys: 1,
  },
  pro: {
    products: 1000,
    scheduledPosts: 500,
    socialAccounts: 10,
    aiRepliesPerMonth: 5000,
    teamMembers: 10,
    apiKeys: 5,
  },
  enterprise: {
    products: Infinity,
    scheduledPosts: Infinity,
    socialAccounts: Infinity,
    aiRepliesPerMonth: Infinity,
    teamMembers: Infinity,
    apiKeys: Infinity,
  },
};

export type ResourceType = keyof typeof PLAN_LIMITS.free;

export async function checkSubscriptionLimit(resource: ResourceType) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: { message: 'Unauthorized' } });
      }

      const subscription = await db.get('subscriptions', req.user.tenantId);

      if (!subscription) {
        return res.status(404).json({ error: { message: 'Subscription not found' } });
      }

      const plan = subscription.plan || 'free';
      const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.[resource];

      if (limit === undefined) {
        return next();
      }

      if (limit === Infinity) {
        return next();
      }

      const usage = subscription.usage?.[resource] || 0;

      if (usage >= limit) {
        return res.status(402).json({
          error: {
            code: 'LIMIT_EXCEEDED',
            message: `${resource} limit reached for ${plan} plan`,
            current: usage,
            limit: limit,
            plan: plan,
            upgrade: `Upgrade to ${getNextPlan(plan)} for more ${resource}`,
          },
        });
      }

      // Attach limit info to request for later use
      (req as any).subscriptionLimit = { resource, usage, limit, plan };

      next();
    } catch (err) {
      next(err);
    }
  };
}

export async function incrementUsage(tenantId: string, resource: ResourceType, amount: number = 1) {
  try {
    const subscription = await db.get('subscriptions', tenantId);

    if (!subscription) {
      console.error(`Subscription not found for tenant ${tenantId}`);
      return;
    }

    const currentUsage = subscription.usage?.[resource] || 0;
    const newUsage = currentUsage + amount;

    await db.update('subscriptions', tenantId, {
      usage: {
        ...subscription.usage,
        [resource]: newUsage,
      },
    });
  } catch (err) {
    console.error(`Failed to increment usage for ${resource}:`, err);
  }
}

export async function decrementUsage(tenantId: string, resource: ResourceType, amount: number = 1) {
  try {
    const subscription = await db.get('subscriptions', tenantId);

    if (!subscription) {
      console.error(`Subscription not found for tenant ${tenantId}`);
      return;
    }

    const currentUsage = subscription.usage?.[resource] || 0;
    const newUsage = Math.max(0, currentUsage - amount);

    await db.update('subscriptions', tenantId, {
      usage: {
        ...subscription.usage,
        [resource]: newUsage,
      },
    });
  } catch (err) {
    console.error(`Failed to decrement usage for ${resource}:`, err);
  }
}

export async function getUsageStats(tenantId: string) {
  try {
    const subscription = await db.get('subscriptions', tenantId);

    if (!subscription) {
      return null;
    }

    const plan = subscription.plan || 'free';
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
    const usage = subscription.usage || {};

    const stats = Object.entries(limits).map(([resource, limit]) => ({
      resource,
      usage: usage[resource as ResourceType] || 0,
      limit,
      percentage: limit === Infinity ? 0 : ((usage[resource as ResourceType] || 0) / limit) * 100,
    }));

    return {
      plan,
      usage,
      limits,
      stats,
    };
  } catch (err) {
    console.error('Failed to get usage stats:', err);
    return null;
  }
}

function getNextPlan(currentPlan: string): string {
  const planHierarchy = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = planHierarchy.indexOf(currentPlan);

  if (currentIndex === -1 || currentIndex === planHierarchy.length - 1) {
    return 'enterprise';
  }

  return planHierarchy[currentIndex + 1];
}

export async function resetMonthlyUsage(tenantId: string) {
  try {
    const subscription = await db.get('subscriptions', tenantId);

    if (!subscription) {
      return;
    }

    await db.update('subscriptions', tenantId, {
      usage: {
        ...subscription.usage,
        aiRepliesPerMonth: 0,
      },
      lastMonthlyReset: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to reset monthly usage:', err);
  }
}
