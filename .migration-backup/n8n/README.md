# AutoBot360 — n8n Workflows

All workflow JSON files live in `workflows/`. See `_manifest.json` for the full catalog and event → webhook mapping.

## What you need from n8n

### 1. Run n8n locally (dev)

```bash
# Docker (recommended)
docker run -it --rm \
  -p 5678:5678 \
  -e N8N_HOST=localhost \
  -e WEBHOOK_URL=http://localhost:5678/ \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n

# Or npx
npx n8n
```

Open **http://localhost:5678** and create an owner account.

### 2. Import workflows (in this order)

| Order | File | Type |
|-------|------|------|
| 1 | `ai-caption.json` | Sub-workflow |
| 2 | `social-media-publish.json` | Sub-workflow |
| 3 | `ai-reply.json` | Sub-workflow |
| 4 | `lead-capture.json` | Sub-workflow |
| 5 | `whatsapp-notification.json` | Sub-workflow |
| 6 | `email.json` | Sub-workflow |
| 7 | `autobot360-connection-test.json` | Webhook |
| 8 | `publish-product.json` | Webhook |
| 9 | `comment-monitoring.json` | Webhook |
| 10 | `razorpay-payment.json` | Webhook |
| 11 | `order-creation.json` | Webhook |
| 12 | `checkout.json` | Webhook |
| 13 | `token-refresh.json` | Webhook |
| 14 | `analytics-sync.json` | Webhook |
| 15 | `scheduled-post.json` | Cron |
| 16 | `failed-retry.json` | Error workflow |

**Import:** n8n UI → **Workflows** → **Import from file** → select each JSON.

After importing sub-workflows, open **Publish Product** and set the **Execute Workflow** node IDs (or use env vars below).

### 3. Activate workflows

Toggle **Active** (top-right) on every webhook workflow. Cron workflow (`scheduled-post`) activates on its own schedule.

### 4. n8n environment variables

Set in n8n → **Settings** → **Environment variables** (or `.env` for self-hosted):

| Variable | Example | Required |
|----------|---------|----------|
| `API_BASE_URL` | `http://localhost:8081` | Yes |
| `INTERNAL_API_KEY` | Same as `services/api/.env` | Yes |
| `N8N_WEBHOOK_SECRET` | Copy from AutoBot360 dashboard after **Connect n8n** | Yes |
| `GEMINI_API_KEY` | Google AI Studio key | Yes (AI flows) |
| `AI_CAPTION_WORKFLOW_ID` | n8n workflow ID of AI Caption | Yes |
| `SOCIAL_PUBLISH_WORKFLOW_ID` | n8n workflow ID of Social Media Publish | Yes |
| `AI_REPLY_WORKFLOW_ID` | n8n workflow ID of AI Reply | Yes |
| `LEAD_CAPTURE_WORKFLOW_ID` | n8n workflow ID of Lead Capture | Yes |
| `ORDER_CREATION_WORKFLOW_ID` | n8n workflow ID of Order Creation | For payments |
| `WHATSAPP_WORKFLOW_ID` | n8n workflow ID of WhatsApp Notification | Optional |
| `EMAIL_WORKFLOW_ID` | n8n workflow ID of Email | Optional |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp phone ID | Optional |
| `WHATSAPP_ACCESS_TOKEN` | Meta system user token | Optional |
| `SMTP_FROM` | `noreply@yourstore.com` | Optional |
| `N8N_WEBHOOK_URL` | `http://localhost:5678` | For scheduled-post |

**Finding workflow IDs:** Open workflow → URL contains `/workflow/{ID}`.

### 5. Connect from AutoBot360

1. API running: `cd services/api && npx tsx src/index.ts`
2. Web app → **Dashboard** or **Integrations** → **Connect n8n automatically**
3. Copy the **webhook secret** shown → paste into n8n as `N8N_WEBHOOK_SECRET`
4. Ensure `services/api/.env` has `N8N_BASE_URL=http://localhost:5678`

### 6. Webhook URLs (after activate)

| Event | Method | URL |
|-------|--------|-----|
| Connection test | POST | `http://localhost:5678/webhook/autobot360-connection-test` |
| Publish product | POST | `http://localhost:5678/webhook/publish-product` |
| Comment monitoring | POST | `http://localhost:5678/webhook/comment-monitoring` |
| Razorpay payment | POST | `http://localhost:5678/webhook/razorpay-payment` |
| Order creation | POST | `http://localhost:5678/webhook/order-creation` |
| Checkout | POST | `http://localhost:5678/webhook/checkout` |
| Token refresh | POST | `http://localhost:5678/webhook/token-refresh` |
| Analytics sync | POST | `http://localhost:5678/webhook/analytics-sync` |

### 7. Headers AutoBot360 sends

```
X-Webhook-Secret: whsec_...   (per tenant)
X-Tenant-Id: tenant_abc123
X-Idempotency-Key: uuid
Content-Type: application/json
```

Body = CloudEvent envelope (see `_manifest.json` → `sampleEventEnvelope`).

## Architecture

```
AutoBot360 API  →  POST /webhook/{workflow}
       ↑                    ↓
   Pub/Sub event      n8n executes workflow
   (dev: in-memory)        ↓
                    HTTP → API /internal/*
                    Gemini / Meta / Razorpay
```

## Production extras

- **Queue mode:** Redis + n8n workers (see `docs/05-N8N.md`)
- **HTTPS:** `WEBHOOK_URL=https://n8n.yourdomain.com/`
- **Secrets:** Use n8n credentials store, not plain env in production
- **Multi-tenant:** One n8n cluster; isolation via `X-Tenant-Id` + per-tenant webhook secret

## Files

```
n8n/workflows/
├── _manifest.json              ← catalog + event map
├── autobot360-connection-test.json
├── publish-product.json
├── comment-monitoring.json
├── ai-caption.json
├── social-media-publish.json
├── ai-reply.json
├── lead-capture.json
├── razorpay-payment.json
├── order-creation.json
├── checkout.json
├── whatsapp-notification.json
├── email.json
├── token-refresh.json
├── analytics-sync.json
├── scheduled-post.json
└── failed-retry.json
```

Full architecture: `docs/05-N8N.md`
