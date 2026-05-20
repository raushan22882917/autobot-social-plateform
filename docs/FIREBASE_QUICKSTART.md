# Firebase + Firestore quick start (frontend + backend)

Do this **before** n8n automation. All app data (users, products, orders) goes to **Firestore** via the API.

## 1. Download service account (one-time)

1. Open [Firebase Console → autobot-founder → Service accounts](https://console.firebase.google.com/project/autobot-founder/settings/serviceaccounts/adminsdk)
2. **Generate new private key** → save as:

```
autobot-n8n/firebase-service-account.json
```

The file must contain `"type": "service_account"` and `"private_key"` — **not** the OAuth `{ "web": ... }` JSON.

Verify:

```bash
npm run firebase:check
```

## 2. API environment (`services/api/.env`)

```env
USE_DEV_STORE=false
FORCE_FIREBASE_ADMIN=true
FIREBASE_SERVICE_ACCOUNT_PATH=../../firebase-service-account.json
GCP_PROJECT_ID=autobot-founder
FIREBASE_PROJECT_ID=autobot-founder
FIREBASE_WEB_API_KEY=<your-web-api-key>
DISABLE_N8N_AUTO_DISPATCH=true
```

Restart API:

```bash
cd services/api && npx tsx src/index.ts
```

You should see: **`Firestore connected (autobot-founder)`**

## 3. Web environment (`apps/web/.env.local`)

Already set for project `autobot-founder`:

- `NEXT_PUBLIC_FIREBASE_*` — client Auth
- `NEXT_PUBLIC_API_URL=http://localhost:8081/api/v1`

## 4. Enable Firestore in Firebase Console

1. [Firestore](https://console.firebase.google.com/project/autobot-founder/firestore) → Create database (production mode is fine; API uses Admin SDK)
2. Deploy indexes (optional; API works without them via in-memory sort):

```bash
npm run firebase:deploy-indexes
```

If you see `FAILED_PRECONDITION: The query requires an index`, click the link in the error or run the command above. Indexes take ~2–5 minutes to build.

## 5. Test the stack

1. Sign up at `http://localhost:3001/signup` with **store name**
2. Open [Firestore data](https://console.firebase.google.com/project/autobot-founder/firestore/data) — you should see `users`, `tenants`, `subscriptions`
3. Add a product in the dashboard — check `products` collection
4. `GET http://localhost:8081/health` → `"storage": "firestore"`

## Data flow

```
Browser (Firebase Auth) → idToken → POST /auth/firebase → API writes Firestore → API JWT
Dashboard pages → Bearer JWT → /api/v1/* → Firestore
```

n8n is **disabled** until you set `DISABLE_N8N_AUTO_DISPATCH=false` and build workflows later.
