# AutoBot360 — Deployment Strategy

## Environment Matrix

| Environment | Frontend | API | n8n | Firebase |
|-------------|----------|-----|-----|----------|
| Development | localhost:3000 | localhost:8080 | localhost:5678 | Emulator |
| Staging | Vercel Preview | Cloud Run staging | Cloud Run staging | Staging project |
| Production | Vercel Production | Cloud Run prod | GKE prod | Prod project |

---

## Docker Strategy

### API Service (`services/api/Dockerfile`)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --workspace=services/api
COPY services/api ./services/api
COPY packages/shared ./packages/shared
RUN npm run build --workspace=services/api

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

### n8n (`infrastructure/docker/n8n/Dockerfile`)
```dockerfile
FROM n8nio/n8n:latest
USER root
RUN apk add --no-cache tini
USER node
ENV EXECUTIONS_MODE=queue
COPY workflows/ /home/node/.n8n/workflows/
```

---

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test

  deploy-api:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: sa-cicd@autobot360-prod.iam.gserviceaccount.com
      - run: gcloud builds submit --tag gcr.io/autobot360-prod/api:${{ github.sha }}
      - run: gcloud run deploy autobot360-api --image gcr.io/autobot360-prod/api:${{ github.sha }} --region asia-south1

  deploy-web:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-n8n-workflows:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: |
          # Import workflows via n8n API
          for f in n8n/workflows/*.json; do
            curl -X POST "$N8N_API_URL/workflows" \
              -H "X-N8N-API-KEY: $N8N_API_KEY" \
              -d @"$f"
          done
```

---

## Cloud Run Deployment

```bash
# Build and deploy API
gcloud builds submit --tag gcr.io/autobot360-prod/api:latest ./services/api
gcloud run deploy autobot360-api \
  --image gcr.io/autobot360-prod/api:latest \
  --region asia-south1 \
  --platform managed \
  --min-instances 2 \
  --max-instances 100 \
  --memory 2Gi \
  --cpu 2 \
  --service-account sa-api@autobot360-prod.iam.gserviceaccount.com \
  --set-secrets="FIREBASE_ADMIN_KEY=firebase-admin-key:latest,JWT_SECRET=jwt-signing-secret:latest" \
  --allow-unauthenticated
```

---

## Vercel Frontend Deployment

```json
// apps/web/vercel.json
{
  "framework": "nextjs",
  "regions": ["bom1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.autobot360.com",
    "NEXT_PUBLIC_FIREBASE_API_KEY": "@firebase-api-key",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN": "autobot360-prod.firebaseapp.com",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID": "autobot360-prod"
  }
}
```

---

## n8n Production Deployment

**Recommended:** GKE Autopilot with Redis Memorystore

```
GKE Cluster (asia-south1)
├── n8n-main (1 replica) — webhooks + UI
├── n8n-worker (3-50 HPA) — executions
├── Redis Memorystore (5GB)
└── Cloud SQL PostgreSQL (n8n metadata, optional vs SQLite)
```

**MVP Alternative:** Cloud Run + Memorystore (queue mode)

---

## Firebase Deployment

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions
```

---

## Domain & SSL

| Domain | Target |
|--------|--------|
| autobot360.com | Vercel |
| api.autobot360.com | Cloud Run via LB |
| n8n.autobot360.com | GKE (internal + IAP) |
| cdn.autobot360.com | Firebase Storage CDN |

---

## Rollback Strategy

- Cloud Run: instant traffic shift to previous revision
- Vercel: instant rollback via dashboard
- n8n: workflow versioning, deactivate new version on failure
- Database: no destructive migrations without backup

```bash
gcloud run services update-traffic autobot360-api --to-revisions=PREVIOUS=100
```
