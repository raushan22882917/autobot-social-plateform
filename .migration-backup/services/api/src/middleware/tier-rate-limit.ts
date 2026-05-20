import { Response, NextFunction } from 'express';
import { db } from '../lib/db';
import type { AuthRequest } from './auth';

// Rate limits per subscription tier (requests per minute)
const TIER_LIMITS = {
  free: 60,
  starter: 300,
  pro: 1000,
  enterprise: 5000,
};

// In-memory rate limit store (for development)
// In production, use Redis
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

async function getRateLimitFromRedis(key: string): Promise<number> {
  // TODO: Implement Redis integration
  // For now, use in-memory store
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < Date.now()) {
    rateLimitStore.set(key, { count: 0, resetAt: Date.now() + 60 * 1000 });
    return 0;
  }

  return entry.count;
}

async function incrementRateLimit(key: string): Promise<number> {
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < Date.now()) {
    rateLimitStore.set(key, { count: 1, resetAt: Date.now() + 60 * 1000 });
    return 1;
  }

  entry.count++;
  return entry.count;
}

export function tierBasedRateLimit() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Skip rate limiting for public endpoints
      if (!req.user) {
        return next();
      }

      // Get subscription tier
      const subscription = await db.get('subscriptions', req.user.tenantId);
      const plan = subscription?.plan || 'free';
      const limit = TIER_LIMITS[plan as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

      // Get rate limit key
      const key = `ratelimit:${req.user.tenantId}`;

      // Increment counter
      const current = await incrementRateLimit(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));
      res.setHeader('X-RateLimit-Reset', Math.ceil((rateLimitStore.get(key)?.resetAt || Date.now()) / 1000));

      // Check if limit exceeded
      if (current > limit) {
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. ${limit} requests per minute allowed for ${plan} plan.`,
            limit,
            current,
            retryAfter: 60,
          },
        });
      }

      next();
    } catch (err) {
      // Don't block requests on rate limit errors
      console.error('Rate limit check failed:', err);
      next();
    }
  };
}

export function getSubscriptionTierLimit(plan: string): number {
  return TIER_LIMITS[plan as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
}

export function cleanupRateLimitStore() {
  const now = Date.now();

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  cleanupRateLimitStore();
}, 5 * 60 * 1000);
