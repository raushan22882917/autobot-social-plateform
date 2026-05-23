# Social OAuth setup (real connections)

## Redirect URIs (required)

Add these **exact** URLs in each provider console (`API_PUBLIC_URL` defaults to `http://localhost:8081`):

| Platform | Redirect URI |
|----------|----------------|
| Instagram | `http://localhost:8081/api/v1/social/oauth/callback/instagram` |
| Facebook | `http://localhost:8081/api/v1/social/oauth/callback/facebook` |
| YouTube | `http://localhost:8081/api/v1/social/oauth/callback/youtube` |
| Google Business | `http://localhost:8081/api/v1/social/oauth/callback/google_business` |

## Meta (Instagram + Facebook)

1. [Meta for Developers](https://developers.facebook.com/apps/) → your app (`META_APP_ID`)
2. **Facebook Login** → Settings → Valid OAuth Redirect URIs → add Instagram + Facebook URLs above
3. **Use cases** → add Instagram API, Pages API
4. Instagram: account must be **Business or Creator**, linked to a **Facebook Page**

```env
META_APP_ID=...
META_APP_SECRET=...
```

## Google (YouTube + Business Profile)

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth client → Authorized redirect URIs
2. Add **both** YouTube and Google Business callback URLs above
3. Enable **YouTube Data API v3** and **My Business Account Management API** (Business Profile)
4. If you see **Quota exceeded (Requests per minute)**: wait 2–3 minutes and connect **once**. Google’s default quota is very low; you can request a higher limit under **APIs & Services → My Business Account Management API → Quotas**.

```env
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
```

Google Business uses scope `https://www.googleapis.com/auth/business.manage`. Sign in with the Google account that owns your Business Profile at [business.google.com](https://business.google.com).

## Flow

1. User clicks **Connect** on `/social`
2. OAuth platforms: browser opens provider login → callback saves tokens → `/social?connected=<platform>`
3. WhatsApp: modal collects token + Phone Number ID → `POST /api/v1/social/connect/whatsapp`

Restart API after changing `.env`.
