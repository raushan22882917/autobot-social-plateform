# AutoBot360

**AI-Powered Social Commerce SaaS Platform**

Multi-tenant platform for social selling automation: connect accounts, publish products, AI comment monitoring, lead capture, Razorpay checkout, and WhatsApp notifications.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  Next.js 15 (Vercel) │ Mobile PWA │ Public Product Pages │ Checkout           │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS
┌───────────────────────────────────▼─────────────────────────────────────────┐
│  Cloud Load Balancer + API Gateway (Express)                                   │
│  Multi-agent REST API + scheduled publish worker                               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    ▼
                    ┌──────────────────────────────┐
                    │  Google Cloud Pub/Sub (opt)  │
                    └──────────────┬───────────────┘
                                   ▼
        ┌──────────────────────────────────────────────────────────┐
        │  Firebase: Auth │ Firestore │ Storage │ FCM                 │
        └──────────────────────────────────────────────────────────┘
                                   ▼
        ┌──────────────────────────────────────────────────────────┐
        │  External: Gemini │ Razorpay │ Meta/IG/WhatsApp/YouTube   │
        │            WhatsApp Cloud API │ SMTP                      │
        └──────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
autobot360/
├── apps/
│   └── web/                    # Next.js 15 frontend
├── services/
│   ├── api/                    # Express API gateway + agents
│   └── workers/                # Pub/Sub consumers (planned)
├── packages/
│   └── shared/                 # Types, validators, constants
├── infrastructure/
│   └── firebase/               # Firestore rules, indexes
└── docs/                       # Architecture documentation
```

## Quick Start

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
cp services/api/.env.example services/api/.env
npm run firebase:check   # verify service account + Firestore
npm run dev
```

## Documentation Index

| Document | Description |
|----------|-------------|
| [docs/01-ARCHITECTURE.md](docs/01-ARCHITECTURE.md) | Full system architecture |
| [docs/02-MULTI-AGENT.md](docs/02-MULTI-AGENT.md) | AI agents specification |
| [docs/03-DATABASE.md](docs/03-DATABASE.md) | Firestore schema & indexes |
| [docs/FIREBASE_QUICKSTART.md](docs/FIREBASE_QUICKSTART.md) | Firebase Auth + Firestore setup |
| [docs/SOCIAL_OAUTH_SETUP.md](docs/SOCIAL_OAUTH_SETUP.md) | Social platform OAuth redirects |
| [docs/06-API.md](docs/06-API.md) | REST API documentation |

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
| 11 | Analytics | `/api/v1/analytics` |
| 12 | Notification | `/api/v1/notifications` |
| 13 | Studio | `/api/v1/studio` |

Publishing runs **directly via platform APIs** (Instagram, Facebook, YouTube, WhatsApp) with a background poll for scheduled posts.

## License

Proprietary — AutoBot360 © 2026
