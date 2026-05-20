# AutoBot360 — Missing Features & Implementation Gaps

**Last Updated:** May 2026  
**Status:** Gap Analysis for Production Readiness

---

## Executive Summary

AutoBot360 has a **solid architectural foundation** with 14 agents, multi-tenancy, event-driven design, and comprehensive documentation. However, there are **critical gaps** between the documented vision and actual implementation that prevent it from being a **complete, production-ready tool**.

**Completion Status:** ~60% implemented, ~40% missing

---

## 🔴 CRITICAL GAPS (Must-Have for Production)

### 1. **Audit Logging & Compliance**

**Documented:** "Structured audit logs" in middleware stack  
**Implemented:** ❌ Not visible in code  
**Impact:** No compliance records, can't track user actions for GDPR/SOC2

**What's Missing:**
- Audit log collection in Firestore
- Middleware to capture all sensitive operations (create/update/delete)
- Audit trail for permission changes, data access, payment operations
- Retention policy (90 days minimum)
- Export endpoint for compliance audits

**Implementation Effort:** 2-3 days

**Files to Create:**
```
services/api/src/
├── middleware/audit-logger.ts
├── agents/audit/routes.ts
└── lib/audit-events.ts

infrastructure/firebase/
└── audit_logs.rules (Firestore rules)
```

**Example Implementation:**
```typescript
// middleware/audit-logger.ts
export function auditLogMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const originalSend = res.send;
  res.send = function(data) {
    if (req.method !== 'GET' && res.statusCode < 400) {
      const auditLog = {
        id: uuidv4(),
        tenantId: req.user?.tenantId,
        userId: req.user?.uid,
        action: `${req.method} ${req.path}`,
        resource: extractResourceType(req.path),
        resourceId: extractResourceId(req.body),
        changes: req.body,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString(),
        status: res.statusCode,
      };
      db.set('audit_logs', auditLog.id, auditLog);
    }
    return originalSend.call(this, data);
  };
  next();
}
```

---

### 2. **Subscription Limit Enforcement**

**Documented:** Plan limits (products, posts, social accounts, AI replies)  
**Implemented:** ❌ Limits stored but not enforced  
**Impact:** Users can exceed plan limits without restriction

**What's Missing:**
- Middleware to check usage before operations
- Usage tracking per tenant
- Graceful error when limit exceeded
- Upgrade prompts in UI

**Implementation Effort:** 2-3 days

**Files to Create:**
```
services/api/src/
├── middleware/subscription-limits.ts
└── lib/usage-tracker.ts
```

**Limits to Enforce:**
```typescript
const PLAN_LIMITS = {
  free: { products: 10, scheduledPosts: 5, socialAccounts: 1, aiRepliesPerMonth: 10, teamMembers: 1 },
  starter: { products: 100, scheduledPosts: 50, socialAccounts: 3, aiRepliesPerMonth: 500, teamMembers: 3 },
  pro: { products: 1000, scheduledPosts: 500, socialAccounts: 10, aiRepliesPerMonth: 5000, teamMembers: 10 },
  enterprise: { products: Infinity, scheduledPosts: Infinity, socialAccounts: Infinity, aiRepliesPerMonth: Infinity, teamMembers: Infinity },
};
```

**Example Middleware:**
```typescript
export async function checkSubscriptionLimits(resource: 'products' | 'posts' | 'accounts') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const subscription = await db.get('subscriptions', req.user!.tenantId);
    const usage = subscription.usage[resource] || 0;
    const limit = PLAN_LIMITS[subscription.plan][resource];
    
    if (usage >= limit) {
      return res.status(402).json({
        error: { code: 'LIMIT_EXCEEDED', message: `${resource} limit reached for ${subscription.plan} plan` }
      });
    }
    next();
  };
}
```

---

### 3. **Tier-Based Rate Limiting**

**Documented:** Free (60), Starter (300), Pro (1000), Enterprise (5000) req/min  
**Implemented:** ❌ Single global limit (300 default)  
**Impact:** All users get same rate limit regardless of plan

**What's Missing:**
- Rate limiter that checks subscription tier
- Per-tenant rate limit tracking
- Graceful 429 responses with retry-after header

**Implementation Effort:** 1-2 days

**Example Implementation:**
```typescript
export function tierBasedRateLimit() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(); // Public endpoints
    
    const subscription = await db.get('subscriptions', req.user.tenantId);
    const tierLimits = { free: 60, starter: 300, pro: 1000, enterprise: 5000 };
    const limit = tierLimits[subscription.plan];
    
    const key = `ratelimit:${req.user.tenantId}`;
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, 60);
    
    if (current > limit) {
      return res.status(429).json({ error: { message: 'Rate limit exceeded' } });
    }
    next();
  };
}
```

---

### 4. **GDPR Data Export & Deletion**

**Documented:** "GDPR-ready: data export and deletion endpoints"  
**Implemented:** ❌ Not visible in routes  
**Impact:** Can't comply with data subject access requests

**What's Missing:**
- `POST /api/v1/auth/export` — Export all user data as JSON
- `POST /api/v1/auth/delete` — Cascade delete tenant data
- Audit trail for deletions
- Anonymization option

**Implementation Effort:** 3-4 days

**Files to Create:**
```
services/api/src/
├── agents/gdpr/routes.ts
└── lib/gdpr-export.ts
```

**Example Implementation:**
```typescript
// agents/gdpr/routes.ts
gdprRouter.post('/export', authMiddleware, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  
  // Collect all tenant data
  const [users, products, orders, payments, posts, comments] = await Promise.all([
    db.query('users', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
    db.query('products', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
    db.query('orders', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
    db.query('payments', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
    db.query('social_posts', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
    db.query('comments', { filters: [{ field: 'tenantId', op: '==', value: tenantId }] }),
  ]);
  
  const exportData = { users, products, orders, payments, posts, comments, exportedAt: new Date() };
  
  // Generate ZIP file
  const zip = new AdmZip();
  zip.addFile('data.json', Buffer.from(JSON.stringify(exportData, null, 2)));
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="autobot360-export-${tenantId}.zip"`);
  res.send(zip.toBuffer());
});

gdprRouter.post('/delete', authMiddleware, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  
  // Cascade delete all tenant data
  const collections = ['users', 'products', 'orders', 'payments', 'social_posts', 'comments', 'subscriptions'];
  
  for (const collection of collections) {
    const docs = await db.query(collection, { filters: [{ field: 'tenantId', op: '==', value: tenantId }] });
    for (const doc of docs) {
      await db.delete(collection, doc.id);
    }
  }
  
  // Audit log
  await db.set('audit_logs', uuidv4(), {
    tenantId,
    action: 'GDPR_DELETE',
    timestamp: new Date().toISOString(),
  });
  
  res.json({ message: 'Tenant data deleted' });
});
```

---

### 5. **MFA/TOTP for Enterprise**

**Documented:** "MFA for enterprise (TOTP)"  
**Implemented:** ❌ Not visible in auth routes  
**Impact:** Enterprise users can't enable 2FA

**What's Missing:**
- TOTP setup endpoint
- TOTP verification endpoint
- Backup codes generation
- MFA enforcement per tenant

**Implementation Effort:** 2-3 days

**Files to Create:**
```
services/api/src/
├── agents/auth/mfa-routes.ts
└── lib/totp.ts
```

**Example Implementation:**
```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// POST /api/v1/auth/mfa/setup
authRouter.post('/mfa/setup', authMiddleware, async (req: AuthRequest, res) => {
  const secret = speakeasy.generateSecret({
    name: `AutoBot360 (${req.user!.email})`,
    issuer: 'AutoBot360',
  });
  
  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
  
  // Store temporary secret (expires in 10 minutes)
  await redis.setex(`mfa_setup:${req.user!.uid}`, 600, secret.base32);
  
  res.json({ qrCode, secret: secret.base32, backupCodes: generateBackupCodes() });
});

// POST /api/v1/auth/mfa/verify
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
  
  // Save MFA to user
  await db.update('users', req.user!.uid, {
    mfaEnabled: true,
    mfaSecret: secret,
    backupCodes: generateBackupCodes(),
  });
  
  res.json({ message: 'MFA enabled' });
});
```

---

### 6. **Team Management**

**Documented:** "Team management" permission in RBAC matrix  
**Implemented:** ❌ No team endpoints  
**Impact:** Can't add team members to workspace

**What's Missing:**
- `POST /api/v1/team/invite` — Send invite
- `GET /api/v1/team/members` — List members
- `PUT /api/v1/team/members/:id/role` — Change role
- `DELETE /api/v1/team/members/:id` — Remove member
- Invite expiration (7 days)

**Implementation Effort:** 2-3 days

**Files to Create:**
```
services/api/src/
├── agents/team/routes.ts
└── lib/team-invites.ts
```

**Database Schema:**
```typescript
// team_invites/{inviteId}
{
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Timestamp;
  createdAt: Timestamp;
}
```

---

### 7. **Viewer Role Implementation**

**Documented:** Viewer role in RBAC matrix  
**Implemented:** ❌ Only owner/admin/editor used  
**Impact:** Can't grant read-only access

**What's Missing:**
- Update RBAC middleware to support viewer role
- Viewer permissions: read-only on all resources
- Viewer cannot create/update/delete

**Implementation Effort:** 1 day

**Example Update:**
```typescript
// middleware/auth.ts
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}

// Usage in routes
productRouter.post('/', requireRole('owner', 'admin', 'editor'), validate(createProductSchema), async (req, res) => {
  // Create product
});

productRouter.get('/', requireRole('owner', 'admin', 'editor', 'viewer'), async (req, res) => {
  // Read products (viewer allowed)
});
```

---

## 🟡 HIGH PRIORITY GAPS (Enterprise Features)

### 8. **Comment Monitoring Agent Routes**

**Documented:** Agent 6 in architecture  
**Implemented:** ❌ Routes not visible  
**Impact:** Can't monitor comments on published posts

**What's Missing:**
- `GET /api/v1/comments` — List comments
- `GET /api/v1/comments/:id` — Comment detail
- `POST /api/v1/comments/:id/approve-reply` — Approve AI reply
- `POST /api/v1/comments/webhook/:platform` — Platform webhook ingress

**Implementation Effort:** 2-3 days

**Files to Create:**
```
services/api/src/
├── agents/comment-monitor/routes.ts
└── agents/comment-monitor/webhook-handlers.ts
```

---

### 9. **AI Sales Agent Routes**

**Documented:** Agent 7 in architecture  
**Implemented:** ❌ Routes not visible  
**Impact:** Can't configure AI auto-reply

**What's Missing:**
- `POST /api/v1/ai-sales/chat` — Process message
- `GET /api/v1/ai-sales/conversations` — List conversations
- `PUT /api/v1/ai-sales/settings` — Configure AI tone, rules
- `GET /api/v1/ai-sales/analytics` — Conversation metrics

**Implementation Effort:** 3-4 days

**Files to Create:**
```
services/api/src/
├── agents/ai-sales/routes.ts
├── agents/ai-sales/chat-handler.ts
└── lib/gemini-context.ts
```

---

### 10. **Meta/Instagram Webhook Validation**

**Documented:** X-Hub-Signature-256 validation  
**Implemented:** ❌ Not visible in code  
**Impact:** Can't receive comment webhooks from Instagram

**What's Missing:**
- Webhook signature validation for Meta
- Webhook endpoint at `POST /api/v1/comments/webhook/instagram`
- Webhook subscription management

**Implementation Effort:** 1-2 days

**Example Implementation:**
```typescript
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

commentRouter.post('/webhook/instagram', async (req, res) => {
  if (!validateMetaWebhook(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const { entry } = req.body;
  for (const item of entry) {
    for (const change of item.changes) {
      await publishEvent('comment.received', {
        tenantId: extractTenantId(change),
        platform: 'instagram',
        commentData: change.value,
      });
    }
  }
  
  res.json({ success: true });
});
```

---

### 11. **WhatsApp Webhook Validation**

**Documented:** WhatsApp signature validation  
**Implemented:** ❌ Not visible in code  
**Impact:** Can't receive WhatsApp message webhooks

**What's Missing:**
- Webhook signature validation for WhatsApp
- Webhook endpoint at `POST /api/v1/whatsapp/webhook`
- Message status tracking

**Implementation Effort:** 1-2 days

---

### 12. **Secret Manager Integration**

**Documented:** "Google Secret Manager (NOT Firestore)"  
**Implemented:** ⚠️ Only local encryption visible  
**Impact:** Secrets stored in code/env instead of Secret Manager

**What's Missing:**
- GCP Secret Manager client integration
- Automatic secret rotation
- Audit logging for secret access

**Implementation Effort:** 2-3 days

**Files to Create:**
```
services/api/src/
└── lib/secret-manager.ts
```

**Example Implementation:**
```typescript
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

---

### 13. **Token Refresh Scheduler**

**Documented:** "Automatic via Token Refresh Workflow"  
**Implemented:** ⚠️ Workflow referenced but not visible  
**Impact:** Social tokens may expire without refresh

**What's Missing:**
- Scheduled job to check expiring tokens daily
- Automatic refresh via platform APIs
- Failure notifications

**Implementation Effort:** 2-3 days

**Files to Create:**
```
services/api/src/
├── agents/social-connect/token-refresh.ts
└── lib/token-refresh-scheduler.ts
```

---

## 🟠 MEDIUM PRIORITY GAPS (Feature Completeness)

### 14. **Advanced Analytics Dashboard**

**Documented:** Analytics agent with AI insights  
**Implemented:** ⚠️ Basic endpoints visible, AI insights missing  
**Impact:** Limited analytics capabilities

**What's Missing:**
- `GET /api/v1/analytics/ai-insights` — Gemini-powered insights
- Trend analysis and predictions
- Cohort analysis
- Custom date ranges

**Implementation Effort:** 3-4 days

---

### 15. **Bulk Operations**

**Documented:** Not explicitly mentioned  
**Implemented:** ❌ Not visible  
**Impact:** Can't bulk import/export products

**What's Missing:**
- `POST /api/v1/products/bulk-import` — CSV import
- `GET /api/v1/products/bulk-export` — CSV export
- Bulk status updates

**Implementation Effort:** 2-3 days

---

### 16. **Webhook Retry Logic**

**Documented:** "Retry orchestration" in error handling  
**Implemented:** ⚠️ Mentioned but not fully visible  
**Impact:** Failed webhooks may not retry properly

**What's Missing:**
- Exponential backoff implementation
- Max retry attempts (5)
- Dead letter queue handling
- Retry status dashboard

**Implementation Effort:** 2-3 days

---

### 17. **Request/Response Logging**

**Documented:** "Structured logging" in monitoring  
**Implemented:** ⚠️ Basic logging visible  
**Impact:** Limited debugging capability

**What's Missing:**
- Request/response body logging (sanitized)
- Trace ID propagation
- Performance metrics per endpoint
- Log aggregation dashboard

**Implementation Effort:** 2-3 days

---

### 18. **Email Notifications**

**Documented:** Email via SMTP/SendGrid  
**Implemented:** ⚠️ WhatsApp visible, email not fully visible  
**Impact:** Users don't receive email notifications

**What's Missing:**
- Email template system
- SendGrid integration
- Email preference management
- Unsubscribe handling

**Implementation Effort:** 2-3 days

---

### 19. **Mobile App Support**

**Documented:** Mobile PWA in architecture  
**Implemented:** ⚠️ Mobile dashboard page exists  
**Impact:** Limited mobile functionality

**What's Missing:**
- Push notification support (FCM)
- Offline mode
- Mobile-optimized API endpoints
- App shell caching

**Implementation Effort:** 4-5 days

---

### 20. **API Key Management**

**Documented:** Not explicitly mentioned  
**Implemented:** ❌ Not visible  
**Impact:** Can't provide API access to third parties

**What's Missing:**
- `POST /api/v1/settings/api-keys` — Generate API key
- `GET /api/v1/settings/api-keys` — List keys
- `DELETE /api/v1/settings/api-keys/:id` — Revoke key
- API key scoping (read/write/admin)

**Implementation Effort:** 2-3 days

---

## 📊 Implementation Priority Matrix

```
┌─────────────────────────────────────────────────────────────┐
│ CRITICAL (Do First)                                         │
├─────────────────────────────────────────────────────────────┤
│ 1. Audit Logging                    [2-3 days]  [HIGH IMPACT]
│ 2. Subscription Limit Enforcement   [2-3 days]  [HIGH IMPACT]
│ 3. Tier-Based Rate Limiting         [1-2 days]  [HIGH IMPACT]
│ 4. GDPR Export/Delete               [3-4 days]  [COMPLIANCE]
│ 5. MFA/TOTP                         [2-3 days]  [SECURITY]
│ 6. Team Management                  [2-3 days]  [FEATURE]
│ 7. Viewer Role                      [1 day]     [QUICK WIN]
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ HIGH PRIORITY (Next Sprint)                                 │
├─────────────────────────────────────────────────────────────┤
│ 8. Comment Monitoring Routes        [2-3 days]
│ 9. AI Sales Routes                  [3-4 days]
│ 10. Meta Webhook Validation         [1-2 days]
│ 11. WhatsApp Webhook Validation     [1-2 days]
│ 12. Secret Manager Integration      [2-3 days]
│ 13. Token Refresh Scheduler         [2-3 days]
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MEDIUM PRIORITY (Future Sprints)                            │
├─────────────────────────────────────────────────────────────┤
│ 14. Advanced Analytics              [3-4 days]
│ 15. Bulk Operations                 [2-3 days]
│ 16. Webhook Retry Logic             [2-3 days]
│ 17. Request/Response Logging        [2-3 days]
│ 18. Email Notifications             [2-3 days]
│ 19. Mobile App Support              [4-5 days]
│ 20. API Key Management              [2-3 days]
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Recommended Implementation Order

### Week 1-2: Foundation (Critical)
1. **Audit Logging** — Required for compliance
2. **Subscription Limits** — Prevent abuse
3. **Tier-Based Rate Limiting** — Fair usage
4. **Viewer Role** — Quick win, enables team features

### Week 3-4: Compliance & Security
5. **GDPR Export/Delete** — Legal requirement
6. **MFA/TOTP** — Enterprise security
7. **Team Management** — Enable collaboration

### Week 5-6: Feature Completeness
8. **Comment Monitoring Routes** — Core feature
9. **AI Sales Routes** — Core feature
10. **Meta/WhatsApp Webhooks** — Platform integration

### Week 7-8: Infrastructure
11. **Secret Manager Integration** — Security best practice
12. **Token Refresh Scheduler** — Reliability
13. **Advanced Analytics** — Product differentiation

---

## 📋 Checklist for Production Readiness

```
CRITICAL (Must Have):
☐ Audit logging middleware + collection
☐ Subscription limit enforcement
☐ Tier-based rate limiting
☐ GDPR export/delete endpoints
☐ MFA/TOTP setup & verification
☐ Team management endpoints
☐ Viewer role enforcement

HIGH PRIORITY:
☐ Comment monitoring routes
☐ AI sales routes
☐ Meta webhook validation
☐ WhatsApp webhook validation
☐ Secret Manager integration
☐ Token refresh scheduler

MEDIUM PRIORITY:
☐ Advanced analytics with AI insights
☐ Bulk import/export
☐ Webhook retry logic with DLQ
☐ Request/response logging
☐ Email notification system
☐ Mobile push notifications
☐ API key management

NICE TO HAVE:
☐ Advanced user segmentation
☐ Custom webhooks
☐ Workflow builder UI
☐ Multi-language support
☐ White-label options
```

---

## 🚀 Quick Wins (1-2 Days Each)

1. **Viewer Role** — Update RBAC middleware
2. **Tier-Based Rate Limiting** — Add subscription check to rate limiter
3. **Meta Webhook Validation** — Add signature verification
4. **WhatsApp Webhook Validation** — Add signature verification
5. **API Key Management** — Simple CRUD endpoints

---

## 📞 Questions for Product Team

1. **Audit Logging:** What events need to be logged? (all operations, or just sensitive ones?)
2. **GDPR:** Do we need anonymization option or just deletion?
3. **MFA:** Should MFA be mandatory for enterprise or optional?
4. **Team Management:** Should there be a team owner role separate from account owner?
5. **Analytics:** What specific insights should Gemini provide?
6. **Mobile:** Is native app planned or PWA sufficient?
7. **API Keys:** Should API keys have expiration dates?

---

## 📚 Related Documentation

- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) — System design
- [02-MULTI-AGENT.md](./02-MULTI-AGENT.md) — Agent specifications
- [07-SECURITY.md](./07-SECURITY.md) — Security architecture
- [06-API.md](./06-API.md) — API documentation

---

**Next Steps:**
1. Review this document with product & engineering teams
2. Prioritize based on business impact
3. Create Jira tickets for each gap
4. Assign to sprints
5. Track implementation progress
