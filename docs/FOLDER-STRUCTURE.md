# AutoBot360 — Complete Folder Structure

```
autobot-n8n/
├── README.md
├── package.json
├── .gitignore
│
├── apps/
│   └── web/                              # Next.js 15 Frontend
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── Dockerfile
│       ├── vercel.json
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── page.tsx              # Landing
│           │   ├── globals.css
│           │   ├── pricing/page.tsx
│           │   ├── login/page.tsx
│           │   ├── signup/page.tsx
│           │   ├── checkout/[sessionId]/page.tsx
│           │   ├── p/[slug]/page.tsx       # Public product
│           │   ├── m/dashboard/page.tsx    # Mobile
│           │   └── (dashboard)/
│           │       ├── layout.tsx
│           │       ├── dashboard/page.tsx
│           │       ├── products/
│           │       ├── social/page.tsx
│           │       ├── posts/page.tsx
│           │       ├── analytics/page.tsx
│           │       ├── orders/page.tsx
│           │       ├── automation/page.tsx
│           │       ├── whatsapp/page.tsx
│           │       ├── customers/page.tsx
│           │       ├── billing/page.tsx
│           │       ├── settings/page.tsx
│           │       ├── notifications/page.tsx
│           │       └── assistant/page.tsx
│           ├── components/
│           │   ├── ui/                     # shadcn primitives
│           │   ├── layout/                 # Sidebar, TopBar
│           │   ├── dashboard/
│           │   ├── products/
│           │   └── providers/
│           ├── lib/
│           │   ├── api.ts
│           │   ├── firebase.ts
│           │   └── utils.ts
│           └── hooks/
│
├── services/
│   ├── api/                              # Express API (14 agents)
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── index.ts
│   │       ├── middleware/
│   │       │   ├── auth.ts
│   │       │   └── error-handler.ts
│   │       ├── lib/
│   │       │   ├── firebase.ts
│   │       │   ├── pubsub.ts
│   │       │   ├── gemini.ts
│   │       │   └── crypto.ts
│   │       ├── agents/
│   │       │   ├── auth/
│   │       │   ├── dashboard/
│   │       │   ├── product/
│   │       │   ├── social-connect/
│   │       │   ├── publish/
│   │       │   ├── comment-monitor/
│   │       │   ├── ai-sales/
│   │       │   ├── checkout/
│   │       │   ├── payment/
│   │       │   ├── order/
│   │       │   ├── whatsapp/
│   │       │   ├── analytics/
│   │       │   ├── notification/
│   │       │   └── orchestration/
│   │       └── internal/
│   │           └── routes.ts
│   └── workers/                          # Pub/Sub consumers
│       └── src/
│           ├── analytics-ingest.ts
│           └── notification-sender.ts
│
├── packages/
│   └── shared/
│       └── src/
│           ├── types.ts
│           ├── events.ts
│           └── validators.ts
│
├── n8n/
│   └── workflows/
│       ├── publish-product.json
│       ├── ai-caption.json
│       ├── social-media-publish.json
│       ├── comment-monitoring.json
│       ├── ai-reply.json
│       ├── lead-capture.json
│       ├── checkout.json
│       ├── razorpay-payment.json
│       ├── order-creation.json
│       ├── whatsapp-notification.json
│       ├── email.json
│       ├── token-refresh.json
│       ├── analytics-sync.json
│       ├── failed-retry.json
│       └── scheduled-post.json
│
├── infrastructure/
│   ├── firebase/
│   │   ├── firestore.rules
│   │   ├── firestore.indexes.json
│   │   └── storage.rules
│   ├── gcp/
│   │   ├── terraform/
│   │   │   ├── main.tf
│   │   │   ├── pubsub.tf
│   │   │   ├── cloud-run.tf
│   │   │   └── monitoring.tf
│   │   └── cloud-functions/
│   │       ├── pubsub-to-n8n/
│   │       └── webhook-router/
│   └── docker/
│       └── n8n/
│           └── Dockerfile
│
├── docs/
│   ├── 01-ARCHITECTURE.md
│   ├── 02-MULTI-AGENT.md
│   ├── 03-DATABASE.md
│   ├── 04-GCP.md
│   ├── 05-N8N.md
│   ├── 06-API.md
│   ├── 07-SECURITY.md
│   ├── 08-DEPLOYMENT.md
│   ├── 09-UI-UX.md
│   ├── 10-EVENTS-QUEUES.md
│   ├── 11-END-TO-END-FLOW.md
│   ├── FOLDER-STRUCTURE.md
│   └── examples/                         # 10 JSON examples
│
└── .github/
    └── workflows/
        ├── deploy.yml
        └── test.yml
```
