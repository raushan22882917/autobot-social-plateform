# AutoBot360 — Quick Integration Guide

**Copy-Paste Ready Code to Integrate All 20 Features**

---

## 🚀 Step 1: Update Main App File

**File:** `services/api/src/index.ts`

Add these imports at the top:

```typescript
import { auditLogMiddleware } from './middleware/audit-logger';
import { tierBasedRateLimit } from './middleware/tier-rate-limit';
import { validateApiKey, apiKeysRouter } from './agents/settings/api-keys-routes';
import { auditRouter } from './agents/audit/routes';
import { gdprRouter } from './agents/gdpr/routes';
import { mfaRouter } from './agents/auth/mfa-routes';
import { teamRouter } from './agents/team/routes';
import { commentRouter } from './agents/comment-monitor/routes';
import { aiSalesRouter } from './agents/ai-sales/routes';
import { scheduleTokenRefreshCheck } from './lib/token-refresh-scheduler';
```

Add middleware after auth middleware (around line where `app.use(authMiddleware)` is):

```typescript
// Rate limiting and audit logging
app.use(tierBasedRateLimit());
app.use(auditLogMiddleware);
app.use(validateApiKey);
```

Add routes before error handler (around line where other routes are registered):

```typescript
// New feature routes
app.use('/api/v1/audit-logs', auditRouter);
app.use('/api/v1/gdpr', gdprRouter);
app.use('/api/v1/auth/mfa', mfaRouter);
app.use('/api/v1/team', teamRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/ai-sales', aiSalesRouter);
app.use('/api/v1/settings/api-keys', apiKeysRouter);
```

Add scheduler initialization in the `start()` function:

```typescript
async function start() {
  // ... existing code ...
  
  // Initialize token refresh scheduler
  scheduleTokenRefreshCheck();
  
  app.listen(PORT, () => {
    console.log(`AutoBot360 API → http://localhost:${PORT}`);
  });
}
```

---

## 🗄️ Step 2: Create Firestore Collections

Run these commands in Firebase Console or use Firebase CLI:

```bash
# Create collections
firebase firestore:delete audit_logs --recursive
firebase firestore:delete gdpr_exports --recursive
firebase firestore:delete gdpr_deletions --recursive
firebase firestore:delete mfa_setups --recursive
firebase firestore:delete team_invites --recursive
firebase firestore:delete comments --recursive
firebase firestore:delete comment_replies --recursive
firebase firestore:delete conversations --recursive
firebase firestore:delete ai_replies --recursive
firebase firestore:delete api_keys --recursive
firebase firestore:delete idempotency_keys --recursive
```

Or manually create in Firebase Console:
1. Go to Firestore Database
2. Click "Create Collection"
3. Enter collection name
4. Click "Create"

---

## 📋 Step 3: Create Firestore Indexes

**File:** `infrastructure/firebase/firestore.rules`

Add these index definitions:

```
# Audit Logs Indexes
match /audit_logs/{auditLogId} {
  allow read: if belongsToTenant(resource.data.tenantId) && hasRole(['owner', 'admin']);
  allow write: if false;
  
  index on (tenantId, timestamp desc);
  index on (tenantId, resource, timestamp desc);
  index on (tenantId, userId, timestamp desc);
  index on (tenantId, status, timestamp desc);
}

# API Keys Indexes
match /api_keys/{keyId} {
  allow read: if belongsToTenant(resource.data.tenantId) && hasRole(['owner', 'admin']);
  allow write: if false;
  
  index on (tenantId, status, createdAt desc);
}

# Comments Indexes
match /comments/{commentId} {
  allow read: if belongsToTenant(resource.data.tenantId);
  allow write: if false;
  
  index on (tenantId, platform, createdAt desc);
  index on (tenantId, status, createdAt desc);
}

# Conversations Indexes
match /conversations/{conversationId} {
  allow read: if belongsToTenant(resource.data.tenantId);
  allow write: if false;
  
  index on (tenantId, updatedAt desc);
}

# Team Invites Indexes
match /team_invites/{inviteId} {
  allow read: if belongsToTenant(resource.data.tenantId) && hasRole(['owner', 'admin']);
  allow write: if false;
  
  index on (tenantId, status, createdAt desc);
}

# Social Accounts Indexes (for token refresh)
match /social_accounts/{accountId} {
  allow read: if belongsToTenant(resource.data.tenantId);
  allow write: if false;
  
  index on (expiresAt asc);
  index on (tenantId, expiresAt asc);
}
```

---

## 🔐 Step 4: Set Environment Variables

**File:** `.env.local` or `.env.production`

```bash
# Audit Logging
AUDIT_LOG_RETENTION_DAYS=90

# MFA/TOTP
MFA_ISSUER=AutoBot360

# Webhooks
META_WEBHOOK_SECRET=your_meta_webhook_secret_here
WHATSAPP_WEBHOOK_SECRET=your_whatsapp_webhook_secret_here
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here
N8N_WEBHOOK_SECRET=your_n8n_webhook_secret_here

# Secret Manager
GCP_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_PROJECT=your-gcp-project-id

# API Keys
API_KEY_PREFIX=sk_
```

---

## 📦 Step 5: Install Dependencies

```bash
cd services/api

# Install required packages
npm install speakeasy qrcode @google-cloud/secret-manager

# Verify installation
npm list speakeasy qrcode @google-cloud/secret-manager
```

---

## 🧪 Step 6: Test Integration

### Test Audit Logging

```bash
curl -X POST http://localhost:8080/api/v1/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Product",
    "price": 100,
    "sku": "TEST-001"
  }'

# Check audit logs
curl -X GET http://localhost:8080/api/v1/audit-logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Rate Limiting

```bash
# Make multiple requests to trigger rate limit
for i in {1..100}; do
  curl -X GET http://localhost:8080/api/v1/products \
    -H "Authorization: Bearer YOUR_JWT_TOKEN"
done

# Should get 429 after limit exceeded
```

### Test MFA Setup

```bash
curl -X POST http://localhost:8080/api/v1/auth/mfa/setup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response includes QR code and secret
```

### Test Team Invite

```bash
curl -X POST http://localhost:8080/api/v1/team/invite \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teammate@example.com",
    "role": "editor"
  }'
```

### Test API Key Generation

```bash
curl -X POST http://localhost:8080/api/v1/settings/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Key",
    "scopes": ["read", "write"]
  }'

# Response includes the API key (only shown once)
```

---

## 🔄 Step 7: Update Product Routes

Add subscription limit checks to existing routes:

```typescript
// services/api/src/agents/product/routes.ts
import { checkSubscriptionLimit, incrementUsage } from '../../middleware/subscription-limits';

// Add middleware to POST /products
productRouter.post(
  '/',
  requireRole('owner', 'admin', 'editor'),
  checkSubscriptionLimit('products'),  // ← Add this
  validate(createProductSchema),
  async (req: AuthRequest, res, next) => {
    try {
      // ... existing code ...
      
      // After creating product, increment usage
      await incrementUsage(req.user!.tenantId, 'products', 1);
      
      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  }
);
```

---

## 📊 Step 8: Update Subscription Schema

**File:** `infrastructure/firebase/firestore.rules`

Update subscriptions collection:

```typescript
// Add to subscriptions/{tenantId}
{
  // ... existing fields ...
  
  // Usage tracking
  usage: {
    products: 5,
    scheduledPosts: 2,
    socialAccounts: 1,
    aiRepliesPerMonth: 50,
    teamMembers: 1,
  },
  
  // AI Settings
  aiSettings: {
    tone: 'friendly',
    autoReplyEnabled: false,
    rules: [],
  },
  
  // Last monthly reset
  lastMonthlyReset: Timestamp,
}
```

---

## 🚀 Step 9: Deploy

```bash
# Build
npm run build

# Test
npm test

# Deploy to staging
gcloud app deploy --version=staging

# Deploy to production
gcloud app deploy --version=prod
```

---

## ✅ Verification Checklist

- [ ] All 13 code files copied to correct locations
- [ ] Middleware registered in main app
- [ ] All routes registered
- [ ] Schedulers initialized
- [ ] Firestore collections created
- [ ] Firestore indexes created
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] Tests passing
- [ ] Staging deployment successful
- [ ] All endpoints tested
- [ ] Production deployment successful

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'speakeasy'"

**Solution:**
```bash
npm install speakeasy qrcode
```

### Issue: "GCP_PROJECT_ID not configured"

**Solution:**
```bash
export GCP_PROJECT_ID=your-project-id
# or add to .env file
```

### Issue: "Firestore collection not found"

**Solution:**
1. Go to Firebase Console
2. Create collection manually
3. Or use Firebase CLI: `firebase firestore:delete collection_name`

### Issue: "Rate limit not working"

**Solution:**
1. Check middleware is registered before routes
2. Verify subscription plan is set
3. Check rate limit store is being updated

### Issue: "Audit logs not being created"

**Solution:**
1. Check middleware is registered
2. Verify operation is in SENSITIVE_OPERATIONS list
3. Check Firestore permissions

---

## 📞 Support

For issues:
1. Check logs: `gcloud app logs read`
2. Check Firestore: Firebase Console → Firestore Database
3. Check environment variables: `echo $GCP_PROJECT_ID`
4. Review implementation guide: `14-IMPLEMENTATION-GUIDE.md`

---

## 🎯 Next Steps

1. **Week 1:** Integrate and test all features
2. **Week 2:** Deploy to staging
3. **Week 3:** User acceptance testing
4. **Week 4:** Deploy to production

---

**Status:** ✅ Ready for Integration  
**Estimated Time:** 2-4 hours  
**Difficulty:** Medium  
**Last Updated:** May 2026
