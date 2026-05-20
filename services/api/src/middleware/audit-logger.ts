import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import type { AuthRequest } from './auth';

interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  action: string;
  method: string;
  resource: string;
  resourceId: string;
  resourceName?: string;
  changes: { before?: any; after?: any };
  status: 'success' | 'failure';
  statusCode: number;
  errorMessage?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  duration: number;
  tags: string[];
  metadata?: Record<string, any>;
}

// Sensitive operations that should be logged
const SENSITIVE_OPERATIONS = [
  'POST /api/v1/products',
  'PUT /api/v1/products',
  'DELETE /api/v1/products',
  'POST /api/v1/orders',
  'PUT /api/v1/orders',
  'DELETE /api/v1/orders',
  'POST /api/v1/payments',
  'POST /api/v1/team/invite',
  'PUT /api/v1/team/members',
  'DELETE /api/v1/team/members',
  'POST /api/v1/auth/mfa/setup',
  'POST /api/v1/auth/mfa/verify',
  'PUT /api/v1/settings',
  'DELETE /api/v1/settings',
  'POST /api/v1/social/accounts',
  'DELETE /api/v1/social/accounts',
  'POST /api/v1/publish/schedule',
  'DELETE /api/v1/publish/scheduled',
];

function shouldAuditLog(method: string, path: string): boolean {
  const action = `${method} ${path}`;
  return SENSITIVE_OPERATIONS.some(op => action.includes(op));
}

function extractResourceInfo(method: string, path: string, body: any) {
  const pathParts = path.split('/');

  if (path.includes('/products')) {
    return {
      resource: 'product',
      resourceId: body.id || pathParts[pathParts.length - 1],
      resourceName: body.title,
      tags: ['product', 'inventory'],
    };
  }

  if (path.includes('/orders')) {
    return {
      resource: 'order',
      resourceId: body.id || pathParts[pathParts.length - 1],
      resourceName: body.orderId,
      tags: ['order', 'sales'],
    };
  }

  if (path.includes('/payments')) {
    return {
      resource: 'payment',
      resourceId: body.id || pathParts[pathParts.length - 1],
      tags: ['payment', 'sensitive', 'pci'],
    };
  }

  if (path.includes('/team')) {
    return {
      resource: 'team',
      resourceId: body.memberId || pathParts[pathParts.length - 1],
      resourceName: body.email,
      tags: ['team', 'access-control'],
    };
  }

  if (path.includes('/auth')) {
    return {
      resource: 'auth',
      resourceId: body.userId,
      tags: ['auth', 'security'],
    };
  }

  if (path.includes('/social')) {
    return {
      resource: 'social',
      resourceId: body.accountId || pathParts[pathParts.length - 1],
      resourceName: body.platform,
      tags: ['social', 'integration'],
    };
  }

  if (path.includes('/publish')) {
    return {
      resource: 'post',
      resourceId: body.postId || pathParts[pathParts.length - 1],
      tags: ['post', 'publishing'],
    };
  }

  return {
    resource: 'unknown',
    resourceId: '',
    tags: [],
  };
}

export function auditLogMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalSend = res.send;

  // Only log sensitive operations
  if (!shouldAuditLog(req.method, req.path)) {
    return next();
  }

  // Capture response
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Only log if user is authenticated
    if (req.user) {
      const { resource, resourceId, resourceName, tags } = extractResourceInfo(
        req.method,
        req.path,
        req.body
      );

      const auditLog: AuditLog = {
        id: `audit_${uuidv4().slice(0, 8)}`,
        tenantId: req.user.tenantId,
        userId: req.user.uid,
        userEmail: req.user.email || 'unknown',
        action: `${req.method} ${req.path}`,
        method: req.method,
        resource,
        resourceId,
        resourceName,
        changes: {
          after: req.body,
        },
        status: statusCode < 400 ? 'success' : 'failure',
        statusCode,
        errorMessage: statusCode >= 400 ? (typeof data === 'string' ? data : data?.error?.message) : undefined,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        duration,
        tags,
      };

      // Write to Firestore asynchronously (don't block response)
      db.set('audit_logs', auditLog.id, auditLog).catch(err => {
        console.error('Failed to write audit log:', err);
      });
    }

    return originalSend.call(this, data);
  };

  next();
}
