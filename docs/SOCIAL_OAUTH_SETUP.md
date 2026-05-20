# Social OAuth setup (real connections)

## Redirect URIs (required)

Add these **exact** URLs in each provider console (`API_PUBLIC_URL` defaults to `http://localhost:8081`):

| Platform | Redirect URI |
|----------|----------------|
| Instagram | `http://localhost:8081/api/v1/social/oauth/callback/instagram` |
| Facebook | `http://localhost:8081/api/v1/social/oauth/callback/facebook` |
| YouTube | `http://localhost:8081/api/v1/social/oauth/callback/youtube` |
| TikTok | `http://localhost:8081/api/v1/social/oauth/callback/tiktok` |

## Meta (Instagram + Facebook)

1. [Meta for Developers](https://developers.facebook.com/apps/) → your app (`META_APP_ID`)
2. **Facebook Login** → Settings → Valid OAuth Redirect URIs → add Instagram + Facebook URLs above
3. **Use cases** → add Instagram API, Pages API
4. Instagram: account must be **Business or Creator**, linked to a **Facebook Page**

```env
META_APP_ID=...
META_APP_SECRET=...
```

## Google (YouTube)

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth client → Authorized redirect URIs
2. Enable **YouTube Data API v3**

```env
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
```

## TikTok

1. [TikTok for Developers](https://developers.tiktok.com/) → create an app
2. **Login Kit** → add redirect URI: TikTok callback URL above
3. Request scopes: `user.info.basic`, `video.upload`, `video.publish` (content scopes may need app review)
4. Copy **Client Key** and **Client Secret**

```env
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
```

## Flow

1. User clicks **Connect** on `/social`
2. Browser opens provider login (Meta / Google / TikTok)
3. API callback saves encrypted tokens → redirects to `/social?connected=tiktok`

Restart API after changing `.env`.
