# AutoBot360

**AI-Powered Social Commerce SaaS Platform**

Multi-tenant platform for social selling automation: connect accounts, publish products, AI comment monitoring, lead capture, Razorpay checkout, and WhatsApp notifications — at enterprise scale.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  Next.js 15 (Vercel) │ Mobile PWA │ Public Product Pages │ Checkout           │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS
┌───────────────────────────────────▼─────────────────────────────────────────┐
│  Cloud Load Balancer + Cloud Armor + API Gateway                               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Cloud Run    │         │  Cloud Functions │         │  n8n Cluster    │
│  API Gateway  │         │  Event Handlers  │         │  (GKE/Cloud Run)│
│  14 Agents    │         │  Webhooks        │         │  15 Workflows   │
└───────┬───────┘         └────────┬────────┘         └────────┬────────┘
        │                          │                           │
        └──────────────────────────┼───────────────────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  Google Cloud Pub/Sub          │
                    │  Topics + Dead Letter Queues   │
                    └──────────────┬───────────────┘
                                   ▼
        ┌──────────────────────────────────────────────────────────┐
        │  Firebase: Auth │ Firestore │ Storage │ FCM                 │
        └──────────────────────────────────────────────────────────┘
                                   ▼
        ┌──────────────────────────────────────────────────────────┐
        │  External: Gemini │ Razorpay │ Meta/IG/LinkedIn APIs     │
        │            WhatsApp Cloud API │ SMTP                      │
        └──────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
autobot-n8n/
├── apps/
│   └── web/                    # Next.js 15 frontend
├── services/
│   ├── api/                    # Express API gateway + agents
│   └── workers/                # Pub/Sub consumers
├── packages/
│   └── shared/                 # Types, validators, constants
├── n8n/
│   └── workflows/              # 15 production workflow JSON files
├── infrastructure/
│   ├── firebase/               # Rules, indexes
│   ├── gcp/                    # Terraform / deployment configs
│   └── docker/
└── docs/                       # Full architecture documentation
```

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment templates
cp apps/web/.env.example apps/web/.env.local
cp services/api/.env.example services/api/.env

# Run development
npm run dev
```

## Documentation Index

| Document | Description |
|----------|-------------|
| [docs/01-ARCHITECTURE.md](docs/01-ARCHITECTURE.md) | Full system architecture |
| [docs/02-MULTI-AGENT.md](docs/02-MULTI-AGENT.md) | 14 AI agents specification |
| [docs/03-DATABASE.md](docs/03-DATABASE.md) | Firestore schema & indexes |
| [docs/04-GCP.md](docs/04-GCP.md) | Google Cloud architecture |
| [docs/05-N8N.md](docs/05-N8N.md) | n8n orchestration (15 workflows) |
| [docs/06-API.md](docs/06-API.md) | REST API documentation |
| [docs/07-SECURITY.md](docs/07-SECURITY.md) | Security & compliance |
| [docs/08-DEPLOYMENT.md](docs/08-DEPLOYMENT.md) | CI/CD & deployment |
| [docs/09-UI-UX.md](docs/09-UI-UX.md) | Frontend architecture |
| [docs/10-EVENTS-QUEUES.md](docs/10-EVENTS-QUEUES.md) | Event-driven & queue design |
| [docs/examples/](docs/examples/) | JSON payload examples |

## Agents

| # | Agent | Service Path |
|---|-------|--------------|
| 1 | Auth | `/api/v1/auth` |
| 2 | Dashboard | `/api/v1/dashboard` |
| 3 | Product | `/api/v1/products` |
| 4 | Social Connect | `/api/v1/social` |
| 5 | Publish | `/api/v1/publish` |
| 6 | Comment Monitor | `/api/v1/comments` |
| 7 | AI Sales | `/api/v1/ai-sales` |
| 8 | Checkout | `/api/v1/checkout` |
| 9 | Payment | `/api/v1/payments` |
| 10 | Order | `/api/v1/orders` |
| 11 | WhatsApp | `/api/v1/whatsapp` |
| 12 | Analytics | `/api/v1/analytics` |
| 13 | Notification | `/api/v1/notifications` |
| 14 | n8n Orchestration | `/api/v1/orchestration` |

## License

Proprietary — AutoBot360 © 2026
