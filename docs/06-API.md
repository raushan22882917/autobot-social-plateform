# AutoBot360 — API Documentation

**Base URL:** `https://api.autobot360.com/api/v1`  
**Auth:** Bearer JWT (Firebase ID token exchange) or `Authorization: Bearer <api_jwt>`

## Authentication Flow

```
1. Client: Firebase signInWithEmail/Google
2. Client: POST /auth/login { idToken: firebaseIdToken }
3. Server: verifyIdToken(idToken) → issue API JWT (RS256, 1h expiry)
4. Client: Authorization: Bearer <api_jwt> on all requests
5. Refresh: POST /auth/refresh { refreshToken }
```

### JWT Claims
```json
{
  "sub": "userId",
  "tenantId": "tenant_abc",
  "role": "owner",
  "plan": "pro",
  "iat": 1715932800,
  "exp": 1715936400
}
```

---

## Auth Agent

### POST /auth/signup
```json
// Request
{
  "email": "seller@example.com",
  "password": "securePass123!",
  "displayName": "Jane Seller",
  "storeName": "Jane's Boutique"
}

// Response 201
{
  "user": { "uid": "...", "email": "...", "tenantId": "..." },
  "token": "eyJ...",
  "refreshToken": "..."
}
```

### POST /auth/login
```json
// Request
{ "idToken": "firebase_id_token_here" }

// Response 200
{
  "user": { "uid", "email", "displayName", "tenantId", "role", "onboardingCompleted" },
  "token": "eyJ...",
  "refreshToken": "...",
  "expiresIn": 3600
}
```

---

## Product Agent

### GET /products
| Param | Type | Description |
|-------|------|-------------|
| status | string | draft, active, archived |
| page | number | Page number (default 1) |
| limit | number | Items per page (max 50) |
| search | string | Title search |

### POST /products
```json
// Request
{
  "title": "Handcrafted Leather Wallet",
  "description": "Premium full-grain leather wallet",
  "price": 2499,
  "sku": "WL-001",
  "inventory": 50,
  "images": [{ "url": "https://...", "alt": "Front view" }],
  "variants": [],
  "status": "active"
}

// Response 201
{
  "id": "prod_abc123",
  "publicUrl": "https://autobot360.com/p/janes-boutique/handcrafted-leather-wallet",
  ...
}
```

---

## Social Connect Agent

### GET /social/connect/instagram
**Response:** `{ "authUrl": "https://api.instagram.com/oauth/authorize?..." }`

### GET /social/callback/instagram?code=...
**Response:** `{ "account": { "id", "username", "platform", "status" } }`

---

## Publish Agent

### POST /publish/schedule
```json
{
  "productId": "prod_abc123",
  "platforms": ["instagram", "facebook"],
  "socialAccountIds": ["sa_001", "sa_002"],
  "scheduledAt": "2026-05-18T10:00:00+05:30",
  "useAiCaption": true,
  "caption": null,
  "hashtags": []
}
```

### GET /publish/scheduled
Paginated list of scheduled posts with status filters.

---

## Payment Agent

### POST /payments/create-order
```json
// Request
{
  "checkoutSessionId": "cs_abc123",
  "amount": 2949,
  "currency": "INR"
}

// Response
{
  "razorpayOrderId": "order_xyz",
  "amount": 294900,
  "currency": "INR",
  "key": "rzp_live_xxx"
}
```

### POST /payments/verify
```json
{
  "razorpayOrderId": "order_xyz",
  "razorpayPaymentId": "pay_abc",
  "razorpaySignature": "signature_hash"
}
```

### POST /payments/webhook (Razorpay → Server)
- Validates `X-Razorpay-Signature`
- Idempotent processing
- Returns 200 immediately

---

## Order Agent

### GET /orders
### GET /orders/:id
### PUT /orders/:id/status
```json
{ "status": "shipped", "trackingNumber": "TRACK123" }
```

---

## Analytics Agent

### GET /analytics/overview?period=30d
```json
{
  "revenue": { "total": 125000, "change": 12.5 },
  "orders": { "total": 48, "change": 8.2 },
  "leads": { "total": 156, "change": 22.1 },
  "engagement": { "total": 12400, "change": 15.3 },
  "conversionRate": 3.2,
  "chartData": [{ "date": "2026-05-01", "revenue": 4200, "orders": 3 }]
}
```

---

## Error Responses

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found",
    "status": 404,
    "traceId": "abc-123"
  }
}
```

| Code | HTTP | Description |
|------|------|-------------|
| UNAUTHORIZED | 401 | Invalid/expired token |
| FORBIDDEN | 403 | Insufficient role |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid input |
| RATE_LIMITED | 429 | Too many requests |
| SUBSCRIPTION_LIMIT | 402 | Plan limit exceeded |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limits

| Tier | Requests/min |
|------|--------------|
| Free | 60 |
| Starter | 300 |
| Pro | 1000 |
| Enterprise | 5000 |

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Internal APIs (service-to-service)

Protected by GCP IAM + internal API key.

| Endpoint | Purpose |
|----------|---------|
| `GET /internal/tokens/:accountId` | Decrypt social OAuth token |
| `POST /internal/idempotency/check` | Check/set idempotency key |
| `GET /internal/scheduled-posts/due` | Fetch posts ready to publish |
| `POST /internal/pubsub/publish` | Publish Pub/Sub message |
