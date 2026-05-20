# AutoBot360 — Security Architecture

## Defense in Depth

```
Layer 1: Cloud Armor (WAF, DDoS, geo-blocking)
Layer 2: API Gateway (JWT validation, rate limiting)
Layer 3: Application middleware (RBAC, input validation)
Layer 4: Firestore Security Rules (tenant isolation)
Layer 5: Secret Manager (credential storage)
Layer 6: Encryption at rest (Firestore, Storage, KMS)
```

---

## Authentication & Authorization

### Firebase Auth
- Email/password with email verification
- Google OAuth 2.0
- Phone OTP (India market)
- MFA for enterprise (TOTP)

### API JWT
- Algorithm: RS256
- Issuer: `autobot360-api`
- Expiry: 1 hour access, 7 day refresh
- Stored: httpOnly secure cookie (web) or secure storage (mobile)

### RBAC Matrix

| Permission | Owner | Admin | Editor | Viewer |
|------------|-------|-------|--------|--------|
| Manage billing | ✓ | ✗ | ✗ | ✗ |
| Connect social | ✓ | ✓ | ✓ | ✗ |
| Create products | ✓ | ✓ | ✓ | ✗ |
| Schedule posts | ✓ | ✓ | ✓ | ✗ |
| View analytics | ✓ | ✓ | ✓ | ✓ |
| Manage orders | ✓ | ✓ | ✓ | ✗ |
| AI auto-reply config | ✓ | ✓ | ✗ | ✗ |
| Team management | ✓ | ✓ | ✗ | ✗ |

---

## Token Security

### Social OAuth Tokens
```
Storage: Google Secret Manager (NOT Firestore)
Encryption: AES-256-GCM with Cloud KMS key
Access: Only sa-n8n@ and sa-api@ service accounts
Rotation: Automatic via Token Refresh Workflow
Audit: Cloud Audit Logs on every secret access
```

### Razorpay
- Webhook signature: HMAC SHA256
- API keys in Secret Manager
- Never log payment details (PCI scope minimization)

---

## Firestore Security Rules

See `infrastructure/firebase/firestore.rules`

Key rules:
- `request.auth != null` required for all reads/writes
- `resource.data.tenantId == getUserTenantId()` on all tenant data
- Public product pages: read-only via Cloud Function proxy (not direct Firestore)
- `checkout_sessions`: create via authenticated API only

---

## Webhook Security

| Webhook Source | Validation |
|----------------|------------|
| Razorpay | `X-Razorpay-Signature` HMAC |
| Meta/Instagram | `X-Hub-Signature-256` |
| n8n internal | `X-Webhook-Secret` |
| WhatsApp | Verify token + signature |

All webhooks:
- HTTPS only (TLS 1.2+)
- IP allowlisting where supported (Razorpay IPs)
- Idempotency keys prevent replay
- Timestamp validation (reject > 5 min old)

---

## API Security

```typescript
// Middleware stack
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(rateLimit({ windowMs: 60000, max: tierLimit }));
app.use(authMiddleware);        // JWT verify
app.use(tenantMiddleware);        // Inject tenantId
app.use(rbacMiddleware);          // Role check per route
app.use(validate(zodSchema));     // Input validation
app.use(auditLogMiddleware);      // Structured audit logs
```

---

## Infrastructure Security

- **Cloud Armor:** OWASP Top 10 rules, rate limiting per IP
- **VPC:** n8n and workers in private VPC, Cloud NAT for egress
- **IAM:** Least privilege per service account
- **KMS:** Customer-managed keys for token encryption
- **Audit:** Admin Activity Audit Logs enabled
- **Vulnerability scanning:** Container Analysis on CI/CD

---

## Data Privacy

- PII encrypted at rest (Firestore native encryption)
- GDPR-ready: data export and deletion endpoints
- Data retention: analytics 2 years, logs 90 days, whatsapp_logs 1 year
- Right to erasure: cascade delete tenant data Cloud Function

---

## Security Headers (Next.js)

```
Content-Security-Policy: default-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```
