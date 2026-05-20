# Firebase Auth Setup — AutoBot360

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project: **`autobot-founder`** (configured in this repo)
3. Enable **Authentication** → Sign-in methods:
   - Email/Password ✓
   - Google ✓ — open **Web SDK configuration** and paste:
     - **Web client ID:** `950884588403-cgkq4807efcnk38kojvvtnpkmo0la4r9.apps.googleusercontent.com`
     - **Web client secret:** from Google Cloud Console (same value as `GOOGLE_OAUTH_CLIENT_SECRET` in `services/api/.env`)

## Step 2: Register Web App

1. Project Settings → Your apps → Add Web app
2. Copy config values to `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=autobot360-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=autobot360-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=autobot360-dev.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Step 3: Service Account (API)

1. Project Settings → **Service accounts** → **Generate new private key**
2. Save the downloaded JSON as `firebase-service-account.json` at the **repo root** (gitignored)

The file must look like this (note `type` and `private_key`):

```json
{
  "type": "service_account",
  "project_id": "autobot-founder",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-...@autobot-founder.iam.gserviceaccount.com"
}
```

**Do not** use the Google Cloud **OAuth Web client** JSON (`{ "web": { "client_id": ... } }`) — that is for browser OAuth only, not API token verification.

3. Copy the example and fill in your downloaded key:

```bash
cp firebase-service-account.example.json firebase-service-account.json
# Paste the real JSON from Firebase Console (do not commit this file)
```

4. Update `services/api/.env` for **Firestore** (all data in the cloud):

```env
USE_DEV_STORE=false
FORCE_FIREBASE_ADMIN=true
FIREBASE_SERVICE_ACCOUNT_PATH=../../firebase-service-account.json
FIREBASE_PROJECT_ID=autobot-founder
FIREBASE_WEB_API_KEY=your-web-api-key
JWT_SECRET=your-secret
```

Restart the API. On startup you should see: `Firestore connected (autobot-founder)`.

For **local-only** testing without Firestore, set `USE_DEV_STORE=true` (data is lost when the API restarts).

## Step 4: Authorized Domains

Firebase Console → Authentication → Settings → Authorized domains:
- `localhost`
- `127.0.0.1` (if you use it)
- Your production domain

Google Cloud Console → APIs & Services → Credentials → your **Web client** (same ID as Firebase Google sign-in).

**Authorized redirect URIs** (both required — fixes `redirect_uri_mismatch`):

- `https://autobot-founder.firebaseapp.com/__/auth/handler` — **Firebase “Continue with Google” login**
- `http://localhost:8081/api/v1/social/oauth/callback/youtube` — **YouTube connect on /social**

**Authorized JavaScript origins:**

- `http://localhost:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`
- `https://autobot-founder.firebaseapp.com`

After saving, wait ~1 minute before retrying sign-in.

## OAuth consent screen: Error 403 access_denied (Testing mode)

If Google shows:

> *Autobot360 has not completed the Google verification process… can only be accessed by developer-approved testers*

your **OAuth consent screen** is in **Testing** status. Valid API keys and a Web client ID do **not** make the app public — Google still restricts who can sign in.

| Publishing status | Who can sign in |
|-------------------|-----------------|
| **Testing** | Only Google accounts listed under **Test users** (max 100) |
| **In production** | Any Google user (may require Google verification for sensitive scopes) |

### Fix for development (recommended now)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials/consent?project=autobot-founder) → **OAuth consent screen**
2. Confirm **User type** is **External** (or Internal if you use Google Workspace)
3. Open **Audience** (or **Test users** on older UI) → **Add users**
4. Add the **exact Gmail address** you use to click “Continue with Google” (e.g. `you@gmail.com`)
5. Save and retry sign-in in an incognito window (or sign out of Google first)

The Google account that **created** the Cloud project is usually allowed automatically; other accounts (team members, customers) must be added as test users until you publish.

### Fix for real customers (later)

1. Same screen → **Publish app** (move to **In production**)
2. For **YouTube** scopes (`youtube.upload`, etc.), Google often requires **app verification** (privacy policy, demo video, domain verification) — plan 1–4+ weeks
3. Firebase **login-only** scopes (`email`, `profile`, `openid`) are usually easier; YouTube connect is what triggers stricter review

## Auth Flow

```
Browser → Firebase Auth (email/Google)
       → getIdToken()
       → POST /api/v1/auth/firebase { idToken }
       → API verifies with Firebase Admin
       → Creates user + tenant in DB
       → Returns API JWT (24h)
       → All API calls use Bearer JWT
```

## Modes

| Config | Storage | Description |
|--------|---------|-------------|
| `USE_DEV_STORE=true` | In-memory | Fast local dev; data lost on API restart |
| `USE_DEV_STORE=false` + service account | **Firestore** | All users, tenants, products, orders in Firebase |
| `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` | Emulator | Local Firestore emulator (optional) |

## Test

```bash
# With Firebase configured
curl -X POST http://localhost:8080/api/v1/auth/config
# → { "mode": "firebase", "firebaseAdmin": true }

# Dev mode (no Firebase)
# → { "mode": "dev", "firebaseAdmin": false }
```
