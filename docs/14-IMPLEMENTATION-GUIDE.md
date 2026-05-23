# AutoBot360 — Complete Implementation Guide

**All 20 Missing Features with Detailed Implementation for Feature #1**

---

## 📋 Quick Reference: All 20 Missing Features

| # | Feature | Priority | Effort | Status |
|---|---------|----------|--------|--------|
| 1 | **Audit Logging System** | 🔴 Critical | 2-3 days | ⭐ DETAILED |
| 2 | Subscription Limit Enforcement | 🔴 Critical | 2-3 days | Overview |
| 3 | Tier-Based Rate Limiting | 🔴 Critical | 1-2 days | Overview |
| 4 | GDPR Data Export & Deletion | 🔴 Critical | 3-4 days | Overview |
| 5 | MFA/TOTP for Enterprise | 🔴 Critical | 2-3 days | Overview |
| 6 | Team Management | 🔴 Critical | 2-3 days | Overview |
| 7 | Viewer Role Implementation | 🔴 Critical | 1 day | Overview |
| 8 | Comment Monitoring Routes | 🟡 High | 2-3 days | Overview |
| 9 | AI Sales Agent Routes | 🟡 High | 3-4 days | Overview |
| 10 | Meta Webhook Validation | 🟡 High | 1-2 days | Overview |
| 11 | WhatsApp Webhook Validation | 🟡 High | 1-2 days | Overview |
| 12 | Secret Manager Integration | 🟡 High | 2-3 days | Overview |
| 13 | Token Refresh Scheduler | 🟡 High | 2-3 days | Overview |
| 14 | Advanced Analytics | 🟠 Medium | 3-4 days | Overview |
| 15 | Bulk Operations | 🟠 Medium | 2-3 days | Overview |
| 16 | Webhook Retry Logic | 🟠 Medium | 2-3 days | Overview |
| 17 | Request/Response Logging | 🟠 Medium | 2-3 days | Overview |
| 18 | Email Notifications | 🟠 Medium | 2-3 days | Overview |
| 19 | Mobile App Support | 🟠 Medium | 4-5 days | Overview |
| 20 | API Key Management | 🟠 Medium | 2-3 days | Overview |

---

## 🌟 FEATURE #1: AUDIT LOGGING SYSTEM (DETAILED)

### Overview
Comprehensive audit logging system to track all sensitive operations for compliance, security, and debugging.

### Why It's Critical
- **Compliance:** GDPR, SOC2, HIPAA require audit trails
- **Security:** Detect unauthorized access and suspicious activity
- **Debugging:** Trace user actions for troubleshooting
- **Accountability:** Track who did what and when

### Architecture

```
User Action
    ↓
Express Middleware (auditLogMiddleware)
    ↓
Extract: action, resource, changes, user, IP
    ↓
Firestore: audit_logs/{id}
    ↓
Optional: Cloud Logging (for long-term retention)
    ↓
API: GET /api/v1/audit-logs (with filters)
```

### Database Schema

```typescript
// Firestore: audit_logs/{auditLogId}
interface AuditLog {
  id: string;                    // UUID
  tenantId: string;              // Multi-tenant isolation
  userId: string;                // Who did it
  userEmail: string;             // For readability
  action: string;                // POST /api/v1/products
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  resource: string;              // 'product', 'order', 'user', etc.
  resourceId: string;            // ID of affected resource
  resourceName?: string;         // Human-readable name
  changes: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  status: 'success' | 'failure';
  statusCode: number;            // HTTP status
  errorMessage?: string;         // If failed
  ipAddress: string;             // Source IP
  userAgent: string;             // Browser/client info
  timestamp: Timestamp;          // When it happened
  duration: number;              // Request duration in ms
  tags: string[];                // 'sensitive', 'payment', 'user-data'
  metadata?: Record<string, any>;
}
```

### Firestore Security Rules

```
match /audit_logs/{auditLogId} {
  // Only admins can read audit logs
  allow read: if belongsToTenant(resource.data.tenantId) 
    && hasRole(['owner', 'admin']);
  
  // Only server can write
  allow write: if false;
}
```

### Implementation

#### Step 1: Create Audit Logger Middleware

```typescript
// services/api/src/middleware/audit-logger.ts
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
  'POST /api/v1/payments',
  'POST /api/v1/team/invite',
  'PUT /api/v1/team/members',
  'DELETE /api/v1/team/members',
  'POST /api/v1/auth/mfa/setup',
  'PUT /api/v1/settings',
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
        errorMessage: statusCode >= 400 ? data?.error?.message : undefined,
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
```

#### Step 2: Create Audit Log Routes

```typescript
// services/api/src/agents/audit/routes.ts
import { Router } from 'express';
import { db } from '../../lib/db';
import { authMiddleware, requireRole, type AuthRequest } from '../../middleware/auth';

export const auditRouter = Router();

// GET /api/v1/audit-logs - List audit logs
auditRouter.get('/', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const { resource, startDate, endDate, userId, limit = 100, offset = 0 } = req.query;
    
    const filters: any[] = [
      { field: 'tenantId', op: '==', value: req.user!.tenantId },
    ];
    
    if (resource) {
      filters.push({ field: 'resource', op: '==', value: resource });
    }
    
    if (userId) {
      filters.push({ field: 'userId', op: '==', value: userId });
    }
    
    if (startDate) {
      filters.push({ field: 'timestamp', op: '>=', value: startDate });
    }
    
    if (endDate) {
      filters.push({ field: 'timestamp', op: '<=', value: endDate });
    }
    
    const logs = await db.query('audit_logs', {
      filters,
      orderBy: { field: 'timestamp', direction: 'desc' },
      limit: Math.min(parseInt(limit as string) || 100, 1000),
      offset: parseInt(offset as string) || 0,
    });
    
    res.json({ logs, total: logs.length });
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
    const { startDate, endDate, resource } = req.body;
    
    const filters: any[] = [
      { field: 'tenantId', op: '==', value: req.user!.tenantId },
    ];
    
    if (startDate) filters.push({ field: 'timestamp', op: '>=', value: startDate });
    if (endDate) filters.push({ field: 'timestamp', op: '<=', value: endDate });
    if (resource) filters.push({ field: 'resource', op: '==', value: resource });
    
    const logs = await db.query('audit_logs', {
      filters,
      orderBy: { field: 'timestamp', direction: 'desc' },
      limit: 10000,
    });
    
    // Convert to CSV
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource', 'Status', 'IP Address', 'Duration (ms)'].join(','),
      ...logs.map(log => [
        log.timestamp,
        log.userEmail,
        log.action,
        `${log.resource}/${log.resourceId}`,
        log.status,
        log.ipAddress,
        log.duration,
      ].join(',')),
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});
```

#### Step 3: Register Middleware in Main App

```typescript
// services/api/src/index.ts
import { auditLogMiddleware } from './middleware/audit-logger';
import { auditRouter } from './agents/audit/routes';

// ... existing middleware ...

// Add audit logging AFTER auth middleware
app.use(authMiddleware);
app.use(auditLogMiddleware);  // ← Add this

// ... existing routes ...

app.use('/api/v1/audit-logs', auditRouter);
```

#### Step 4: Add Firestore Indexes

```
Collection: audit_logs
Indexes:
  - tenantId (Ascending)
  - tenantId (Ascending), timestamp (Descending)
  - tenantId (Ascending), resource (Ascending), timestamp (Descending)
  - tenantId (Ascending), userId (Ascending), timestamp (Descending)
  - tenantId (Ascending), status (Ascending), timestamp (Descending)

TTL Policy:
  - Delete documents where timestamp > 90 days old
```

#### Step 5: Add Audit Log Retention Policy

```typescript
// services/api/src/lib/audit-retention.ts
import { db } from './db';

export async function cleanupOldAuditLogs() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const oldLogs = await db.query('audit_logs', {
    filters: [
      { field: 'timestamp', op: '<', value: ninetyDaysAgo.toISOString() },
    ],
    limit: 1000,
  });
  
  for (const log of oldLogs) {
    await db.delete('audit_logs', log.id);
  }
  
  console.log(`Deleted ${oldLogs.length} old audit logs`);
}

// Schedule daily cleanup
setInterval(() => {
  cleanupOldAuditLogs().catch(err => console.error('Audit cleanup failed:', err));
}, 24 * 60 * 60 * 1000); // Every 24 hours
```

### Testing

```typescript
// services/api/src/agents/audit/__tests__/audit.test.ts
import request from 'supertest';
import app from '../../../index';

describe('Audit Logging', () => {
  it('should log product creation', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: 'Test Product',
        price: 100,
        sku: 'TEST-001',
      });
    
    expect(res.status).toBe(201);
    
    // Verify audit log was created
    const auditRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(auditRes.body.logs).toContainEqual(
      expect.objectContaining({
        resource: 'product',
        action: 'POST /api/v1/products',
        status: 'success',
      })
    );
  });
  
  it('should not log GET requests', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(res.status).toBe(200);
    
    // Verify no audit log for GET
    const auditRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(auditRes.body.logs).not.toContainEqual(
      expect.objectContaining({
        action: 'GET /api/v1/products',
      })
    );
  });
  
  it('should only allow admins to view audit logs', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${viewerToken}`);
    
    expect(res.status).toBe(403);
  });
});
```

### UI Component (Next.js)

```typescript
// apps/web/src/components/audit/audit-logs-table.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/data/data-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function AuditLogsTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => fetch('/api/v1/audit-logs').then(r => r.json()),
  });
  
  const columns = [
    {
      accessorKey: 'timestamp',
      header: 'Time',
      cell: (info: any) => format(new Date(info.getValue()), 'MMM dd, HH:mm:ss'),
    },
    {
      accessorKey: 'userEmail',
      header: 'User',
    },
    {
      accessorKey: 'action',
      header: 'Action',
    },
    {
      accessorKey: 'resource',
      header: 'Resource',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info: any) => (
        <Badge variant={info.getValue() === 'success' ? 'default' : 'destructive'}>
          {info.getValue()}
        </Badge>
      ),
    },
    {
      accessorKey: 'duration',
      header: 'Duration (ms)',
    },
  ];
  
  return (
    <DataTable
      columns={columns}
      data={data?.logs || []}
      isLoading={isLoading}
    />
  );
}
```

### Compliance Benefits

✅ **GDPR:** Track all data access and modifications  
✅ **SOC2:** Demonstrate access controls and monitoring  
✅ **HIPAA:** Maintain audit trail for healthcare data  
✅ **PCI DSS:** Track payment-related operations  
✅ **ISO 27001:** Evidence of security controls

---

## 📋 FEATURES #2-20: QUICK OVERVIEW


### Feature #2: Subscription Limit Enforcement

**What:** Prevent users from exceeding plan limits (products, posts, accounts, etc.)

**Why:** Prevent abuse, ensure fair usage, protect infrastructure

**Implementation:**
```typescript
// middleware/subscription-limits.ts
export async function checkSubscriptionLimits(resource: 'products' | 'posts' | 'accounts') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const subscription = await db.get('subscriptions', req.user!.tenantId);
    const usage = subscription.usage[resource] || 0;
    const limit = PLAN_LIMITS[subscription.plan][resource];
    
    if (usage >= limit) {
      return res.status(402).json({
        error: { 
          code: 'LIMIT_EXCEEDED',
          message: `${resource} limit reached for ${subscription.plan} plan`,
          current: usage,
          limit: limit,
        }
      });
    }
    next();
  };
}

// Usage in routes
productRouter.post('/', 
  requireRole('owner', 'admin', 'editor'),
  checkSubscriptionLimits('products'),
  validate(createProductSchema),
  async (req, res) => { /* create product */ }
);
```

**Files to Create:**
- `services/api/src/middleware/subscription-limits.ts`
- `services/api/src/lib/usage-tracker.ts`

**Effort:** 2-3 days

---

### Feature #3: Tier-Based Rate Limiting

**What:** Different rate limits for different subscription tiers

**Why:** Fair usage, prevent abuse, monetize premium tiers

**Implementation:**
```typescript
// middleware/tier-rate-limit.ts
const TIER_LIMITS = {
  free: 60,        // 60 req/min
  starter: 300,    // 300 req/min
  pro: 1000,       // 1000 req/min
  enterprise: 5000, // 5000 req/min
};

export function tierBasedRateLimit() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next();
    
    const subscription = await db.get('subscriptions', req.user.tenantId);
    const limit = TIER_LIMITS[subscription.plan];
    const key = `ratelimit:${req.user.tenantId}`;
    
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, 60);
    
    if (current > limit) {
      return res.status(429).json({ 
        error: { message: 'Rate limit exceeded' },
        retryAfter: 60,
      });
    }
    next();
  };
}
```

**Files to Create:**
- `services/api/src/middleware/tier-rate-limit.ts`

**Effort:** 1-2 days

---

### Feature #4: GDPR Data Export & Deletion

**What:** Export all user data as JSON/CSV, cascade delete tenant data

**Why:** GDPR compliance, right to erasure, data portability

**Implementation:**
```typescript
// agents/gdpr/routes.ts
gdprRouter.post('/export', authMiddleware, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  
  const [users, products, orders, payments, posts, comments] = await Promise.all([
    db.query('users', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
    db.query('products', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
    db.query('orders', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
    db.query('payments', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
    db.query('social_posts', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
    db.query('comments', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
  ]);
  
  const exportData = { users, products, orders, payments, posts, comments };
  const zip = new AdmZip();
  zip.addFile('data.json', Buffer.from(JSON.stringify(exportData, null, 2)));
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="export-${tenantId}.zip"`);
  res.send(zip.toBuffer());
});

gdprRouter.post('/delete', authMiddleware, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const collections = ['users', 'products', 'orders', 'payments', 'social_posts', 'comments'];
  
  for (const collection of collections) {
    const docs = await db.query(collection, { filters: [{ field: 'tenantId', op: '==', value: tenantId }] });
    for (const doc of docs) await db.delete(collection, doc.id);
  }
  
  res.json({ message: 'Tenant data deleted' });
});
```

**Files to Create:**
- `services/api/src/agents/gdpr/routes.ts`
- `services/api/src/lib/gdpr-export.ts`

**Effort:** 3-4 days

---

### Feature #5: MFA/TOTP for Enterprise

**What:** Two-factor authentication using TOTP (Time-based One-Time Password)

**Why:** Enterprise security requirement, prevent account takeover

**Implementation:**
```typescript
// agents/auth/mfa-routes.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

authRouter.post('/mfa/setup', authMiddleware, async (req: AuthRequest, res) => {
  const secret = speakeasy.generateSecret({
    name: `AutoBot360 (${req.user!.email})`,
    issuer: 'AutoBot360',
  });
  
  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
  await redis.setex(`mfa_setup:${req.user!.uid}`, 600, secret.base32);
  
  res.json({ qrCode, secret: secret.base32 });
});

authRouter.post('/mfa/verify', authMiddleware, async (req: AuthRequest, res) => {
  const { token } = req.body;
  const secret = await redis.get(`mfa_setup:${req.user!.uid}`);
  
  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2,
  });
  
  if (!verified) return res.status(400).json({ error: { message: 'Invalid token' } });
  
  await db.update('users', req.user!.uid, {
    mfaEnabled: true,
    mfaSecret: secret,
  });
  
  res.json({ message: 'MFA enabled' });
});
```

**Files to Create:**
- `services/api/src/agents/auth/mfa-routes.ts`
- `services/api/src/lib/totp.ts`

**Effort:** 2-3 days

---

### Feature #6: Team Management

**What:** Invite team members, assign roles, manage permissions

**Why:** Enable team collaboration, agency use cases

**Implementation:**
```typescript
// agents/team/routes.ts
teamRouter.post('/invite', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res) => {
  const { email, role } = req.body;
  
  const inviteId = `invite_${uuidv4().slice(0, 8)}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await db.set('team_invites', inviteId, {
    id: inviteId,
    tenantId: req.user!.tenantId,
    email,
    role,
    invitedBy: req.user!.uid,
    status: 'pending',
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  });
  
  // Send email with invite link
  await sendInviteEmail(email, inviteId);
  
  res.json({ inviteId });
});

teamRouter.get('/members', authMiddleware, async (req: AuthRequest, res) => {
  const members = await db.query('users', {
    filters: [{ field: 'tenantId', op: '==', value: req.user!.tenantId }],
  });
  
  res.json({ members });
});
```

**Files to Create:**
- `services/api/src/agents/team/routes.ts`
- `services/api/src/lib/team-invites.ts`

**Effort:** 2-3 days

---

### Feature #7: Viewer Role Implementation

**What:** Read-only access role for team members

**Why:** Enable read-only access, improve security

**Implementation:**
```typescript
// Update RBAC middleware
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    }
    next();
  };
}

// Usage
productRouter.get('/', requireRole('owner', 'admin', 'editor', 'viewer'), ...);
productRouter.post('/', requireRole('owner', 'admin', 'editor'), ...);
```

**Files to Update:**
- `services/api/src/middleware/auth.ts`

**Effort:** 1 day

---

### Feature #8: Comment Monitoring Routes

**What:** API endpoints to ingest, filter, and manage comments from social platforms

**Why:** Core feature for social commerce

**Implementation:**
```typescript
// agents/comment-monitor/routes.ts
commentRouter.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const { platform, status, limit = 50 } = req.query;
  
  const filters = [{ field: 'tenantId', op: '==', value: req.user!.tenantId }];
  if (platform) filters.push({ field: 'platform', op: '==', value: platform });
  if (status) filters.push({ field: 'status', op: '==', value: status });
  
  const comments = await db.query('comments', {
    filters,
    orderBy: { field: 'createdAt', direction: 'desc' },
    limit: Math.min(parseInt(limit as string), 100),
  });
  
  res.json({ comments });
});

commentRouter.post('/webhook/:platform', async (req, res) => {
  const { platform } = req.params;
  
  if (platform === 'instagram') {
    if (!validateMetaWebhook(req)) return res.status(401).json({ error: 'Invalid signature' });
  }
  
  await publishEvent('comment.received', {
    tenantId: extractTenantId(req.body),
    platform,
    commentData: req.body,
  });
  
  res.json({ success: true });
});
```

**Files to Create:**
- `services/api/src/agents/comment-monitor/routes.ts`
- `services/api/src/agents/comment-monitor/webhook-handlers.ts`

**Effort:** 2-3 days

---

### Feature #9: AI Sales Agent Routes

**What:** API endpoints for AI-powered chat and auto-reply

**Why:** Core feature for lead generation and sales

**Implementation:**
```typescript
// agents/ai-sales/routes.ts
aiSalesRouter.post('/chat', authMiddleware, async (req: AuthRequest, res) => {
  const { conversationId, message } = req.body;
  
  const conversation = await db.get('conversations', conversationId);
  const products = await db.query('products', {
    filters: [{ field: 'tenantId', op: '==', value: req.user!.tenantId }],
  });
  
  const response = await generateAIReply({
    message,
    products,
    conversationHistory: conversation.messages,
  });
  
  await db.update('conversations', conversationId, {
    messages: [...conversation.messages, { role: 'user', content: message }, { role: 'assistant', content: response }],
  });
  
  res.json({ response });
});

aiSalesRouter.put('/settings', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res) => {
  const { tone, autoReplyEnabled, rules } = req.body;
  
  await db.update('subscriptions', req.user!.tenantId, {
    aiSettings: { tone, autoReplyEnabled, rules },
  });
  
  res.json({ message: 'Settings updated' });
});
```

**Files to Create:**
- `services/api/src/agents/ai-sales/routes.ts`
- `services/api/src/agents/ai-sales/chat-handler.ts`

**Effort:** 3-4 days

---

### Feature #10: Meta Webhook Validation

**What:** Validate Instagram/Facebook webhook signatures

**Why:** Ensure webhooks are from Meta, prevent spoofing

**Implementation:**
```typescript
// lib/meta-webhook.ts
import crypto from 'crypto';

export function validateMetaWebhook(req: Request): boolean {
  const signature = req.get('X-Hub-Signature-256');
  if (!signature) return false;
  
  const payload = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', process.env.META_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${hash}`;
}
```

**Files to Create:**
- `services/api/src/lib/meta-webhook.ts`

**Effort:** 1-2 days

---

### Feature #11: WhatsApp Webhook Validation

**What:** Validate WhatsApp Cloud API webhook signatures

**Why:** Ensure webhooks are from WhatsApp, prevent spoofing

**Implementation:**
```typescript
// lib/whatsapp-webhook.ts
export function validateWhatsAppWebhook(req: Request): boolean {
  const signature = req.get('X-Webhook-Signature');
  if (!signature) return false;
  
  const payload = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');
  
  return signature === hash;
}
```

**Files to Create:**
- `services/api/src/lib/whatsapp-webhook.ts`

**Effort:** 1-2 days

---

### Feature #12: Secret Manager Integration

**What:** Store secrets in GCP Secret Manager instead of environment variables

**Why:** Better security, automatic rotation, audit logging

**Implementation:**
```typescript
// lib/secret-manager.ts
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

export async function getSecret(secretName: string): Promise<string> {
  const name = client.secretVersionPath(process.env.GCP_PROJECT_ID!, secretName, 'latest');
  const [version] = await client.accessSecretVersion({ name });
  return version.payload?.data?.toString() || '';
}

export async function createSecret(secretName: string, secretValue: string): Promise<void> {
  const parent = client.projectPath(process.env.GCP_PROJECT_ID!);
  
  const [secret] = await client.createSecret({
    parent,
    secretId: secretName,
    secret: { replication: { automatic: {} } },
  });
  
  await client.addSecretVersion({
    parent: secret.name,
    payload: { data: Buffer.from(secretValue) },
  });
}
```

**Files to Create:**
- `services/api/src/lib/secret-manager.ts`

**Effort:** 2-3 days

---

### Feature #13: Token Refresh Scheduler

**What:** Automatically refresh expiring social media tokens

**Why:** Prevent token expiration, maintain platform connectivity

**Implementation:**
```typescript
// lib/token-refresh-scheduler.ts
export async function refreshExpiringTokens() {
  const accounts = await db.query('social_accounts', {
    filters: [
      { field: 'expiresAt', op: '<', value: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  });
  
  for (const account of accounts) {
    await publishEvent('token.expiring', {
      tenantId: account.tenantId,
      accountId: account.id,
      platform: account.platform,
    });
  }
}

// Schedule daily
setInterval(() => {
  refreshExpiringTokens().catch(err => console.error('Token refresh failed:', err));
}, 24 * 60 * 60 * 1000);
```

**Files to Create:**
- `services/api/src/lib/token-refresh-scheduler.ts`

**Effort:** 2-3 days

---

### Feature #14: Advanced Analytics

**What:** AI-powered insights, trend analysis, predictions

**Why:** Product differentiation, better decision-making

**Implementation:**
```typescript
// agents/analytics/ai-insights.ts
analyticsRouter.get('/ai-insights', authMiddleware, async (req: AuthRequest, res) => {
  const { dateRange = '30d' } = req.query;
  
  const analytics = await db.query('analytics', {
    filters: [{ field: 'tenantId', op: '==', value: req.user!.tenantId }],
  });
  
  const insights = await generateInsights(analytics, dateRange);
  
  res.json({ insights });
});
```

**Files to Create:**
- `services/api/src/agents/analytics/ai-insights.ts`

**Effort:** 3-4 days

---

### Feature #15: Bulk Operations

**What:** Bulk import/export products, bulk status updates

**Why:** Improve user experience, enable data migration

**Implementation:**
```typescript
// agents/product/bulk-routes.ts
productRouter.post('/bulk-import', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res) => {
  const { csvData } = req.body;
  const products = parseCSV(csvData);
  
  for (const product of products) {
    await db.set('products', `prod_${uuidv4().slice(0, 8)}`, {
      ...product,
      tenantId: req.user!.tenantId,
    });
  }
  
  res.json({ imported: products.length });
});

productRouter.get('/bulk-export', authMiddleware, async (req: AuthRequest, res) => {
  const products = await db.query('products', {
    filters: [{ field: 'tenantId', op: '==', value: req.user!.tenantId }],
  });
  
  const csv = convertToCSV(products);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});
```

**Files to Create:**
- `services/api/src/agents/product/bulk-routes.ts`

**Effort:** 2-3 days

---

### Feature #16: Webhook Retry Logic

**What:** Exponential backoff retry for failed webhooks

**Why:** Reliability, prevent data loss

**Implementation:**
```typescript
// lib/webhook-retry.ts
export async function retryWebhook(webhookId: string, maxAttempts = 5) {
  const webhook = await db.get('webhooks', webhookId);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fetch(webhook.url, {
        method: 'POST',
        body: JSON.stringify(webhook.payload),
        headers: { 'X-Webhook-Attempt': attempt.toString() },
      });
      
      await db.update('webhooks', webhookId, { status: 'delivered' });
      return;
    } catch (err) {
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Move to DLQ
  await db.set('webhook_dlq', webhookId, webhook);
}
```

**Files to Create:**
- `services/api/src/lib/webhook-retry.ts`

**Effort:** 2-3 days

---

### Feature #17: Request/Response Logging

**What:** Log all requests/responses with trace IDs

**Why:** Debugging, performance monitoring

**Implementation:**
```typescript
// middleware/request-logger.ts
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const traceId = req.get('X-Cloud-Trace-Context') || `trace_${uuidv4()}`;
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      traceId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    }));
  });
  
  next();
}
```

**Files to Create:**
- `services/api/src/middleware/request-logger.ts`

**Effort:** 2-3 days

---

### Feature #18: Email Notifications

**What:** Send email notifications via SendGrid

**Why:** User engagement, order updates

**Implementation:**
```typescript
// lib/email-service.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(to: string, template: string, data: any) {
  const templates = {
    order_confirmation: 'order-confirmation-template-id',
    payment_received: 'payment-received-template-id',
  };
  
  await sgMail.send({
    to,
    from: 'noreply@autobot360.com',
    templateId: templates[template],
    dynamicTemplateData: data,
  });
}
```

**Files to Create:**
- `services/api/src/lib/email-service.ts`

**Effort:** 2-3 days

---

### Feature #19: Mobile App Support

**What:** Push notifications, offline mode, mobile-optimized endpoints

**Why:** Expand to mobile users

**Implementation:**
```typescript
// lib/fcm-service.ts
import admin from 'firebase-admin';

export async function sendPushNotification(userId: string, title: string, body: string) {
  const user = await db.get('users', userId);
  
  if (user.fcmToken) {
    await admin.messaging().send({
      token: user.fcmToken,
      notification: { title, body },
    });
  }
}
```

**Files to Create:**
- `services/api/src/lib/fcm-service.ts`
- `apps/web/src/app/m/dashboard/page.tsx` (mobile dashboard)

**Effort:** 4-5 days

---

### Feature #20: API Key Management

**What:** Generate, revoke, and manage API keys for third-party integrations

**Why:** Enable third-party integrations, improve security

**Implementation:**
```typescript
// agents/settings/api-keys-routes.ts
settingsRouter.post('/api-keys', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res) => {
  const { name, scopes } = req.body;
  const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
  
  await db.set('api_keys', apiKey, {
    id: apiKey,
    tenantId: req.user!.tenantId,
    name,
    scopes,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  });
  
  res.json({ apiKey });
});

settingsRouter.get('/api-keys', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res) => {
  const keys = await db.query('api_keys', {
    filters: [{ field: 'tenantId', op: '==', value: req.user!.tenantId }],
  });
  
  res.json({ keys: keys.map(k => ({ ...k, id: k.id.slice(0, 8) + '...' })) });
});

settingsRouter.delete('/api-keys/:id', authMiddleware, requireRole('owner', 'admin'), async (req: AuthRequest, res) => {
  await db.delete('api_keys', req.params.id);
  res.json({ message: 'API key revoked' });
});
```

**Files to Create:**
- `services/api/src/agents/settings/api-keys-routes.ts`

**Effort:** 2-3 days

---

## 📊 Summary Table

| # | Feature | Priority | Effort | Files | Status |
|---|---------|----------|--------|-------|--------|
| 1 | Audit Logging | 🔴 | 2-3d | 5 | ⭐ DETAILED |
| 2 | Subscription Limits | 🔴 | 2-3d | 2 | Overview |
| 3 | Tier Rate Limiting | 🔴 | 1-2d | 1 | Overview |
| 4 | GDPR Export/Delete | 🔴 | 3-4d | 2 | Overview |
| 5 | MFA/TOTP | 🔴 | 2-3d | 2 | Overview |
| 6 | Team Management | 🔴 | 2-3d | 2 | Overview |
| 7 | Viewer Role | 🔴 | 1d | 1 | Overview |
| 8 | Comment Monitoring | 🟡 | 2-3d | 2 | Overview |
| 9 | AI Sales Agent | 🟡 | 3-4d | 2 | Overview |
| 10 | Meta Webhooks | 🟡 | 1-2d | 1 | Overview |
| 11 | WhatsApp Webhooks | 🟡 | 1-2d | 1 | Overview |
| 12 | Secret Manager | 🟡 | 2-3d | 1 | Overview |
| 13 | Token Refresh | 🟡 | 2-3d | 1 | Overview |
| 14 | Advanced Analytics | 🟠 | 3-4d | 1 | Overview |
| 15 | Bulk Operations | 🟠 | 2-3d | 1 | Overview |
| 16 | Webhook Retry | 🟠 | 2-3d | 1 | Overview |
| 17 | Request Logging | 🟠 | 2-3d | 1 | Overview |
| 18 | Email Notifications | 🟠 | 2-3d | 1 | Overview |
| 19 | Mobile Support | 🟠 | 4-5d | 2 | Overview |
| 20 | API Key Management | 🟠 | 2-3d | 1 | Overview |

---

## 🚀 Implementation Priority

**Week 1-2 (Critical Foundation):**
1. Audit Logging ⭐
2. Subscription Limits
3. Tier Rate Limiting
4. Viewer Role

**Week 3-4 (Compliance):**
5. GDPR Export/Delete
6. MFA/TOTP
7. Team Management

**Week 5-6 (Features):**
8. Comment Monitoring
9. AI Sales Agent
10. Meta/WhatsApp Webhooks

**Week 7-8 (Infrastructure):**
12. Secret Manager
13. Token Refresh
14. Advanced Analytics

---

**Total Implementation Time:** 22-32 days (4-6 weeks with 1 engineer)  
**Recommended Team:** 3-4 backend engineers  
**Timeline:** 8 weeks with full team
