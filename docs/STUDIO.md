# Content Studio

Route: **`/studio`** (sidebar → Studio)

## Features

- Pick a product from your catalog
- Upload your own **images** (10MB) and **videos** (100MB, mp4/mov/webm) — drag & drop or **Upload video** in Media Assets
- **Gemini** generates headline, caption, hashtags, and CTA (uses product images as vision input)
- Live **preview** mockup
- **Save draft** to Firestore (`studio_drafts`)
- **Schedule** → creates `scheduled_posts` and appears on Posts page

## Environment (`services/api/.env`)

```env
GEMINI_API_KEY=your_key_from_aistudio.google.com
GEMINI_MODEL=gemini-3.5-flash

HITEM3D_CLIENT_ID=your_client_id
HITEM3D_CLIENT_SECRET=your_client_secret
HITEM3D_API_BASE_URL=https://api.hitem3d.ai
```

Hitem3D token is fetched server-side via `POST /open-api/v1/auth/token` (Basic auth). Never expose the secret to the browser.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/studio/config` | Gemini + Hitem3D configured |
| POST | `/api/v1/studio/generate` | Gemini post copy |
| POST | `/api/v1/studio/hitem3d/token` | Test Hitem3D connection |
| GET | `/api/v1/studio/drafts` | List drafts |
| POST | `/api/v1/studio/drafts` | Save draft |
| POST | `/api/v1/studio/drafts/:id/schedule` | Schedule to social |

Restart API after updating `.env`.

## Publishing scheduled posts

The API publishes directly to connected platforms:

1. Connect **Instagram** and/or **Facebook** on `/social`
2. Use a product with **public image URLs** (`https://…`) — base64 uploads in Studio are not sent to Meta
3. Schedule in Studio or Posts — due posts run every 30s; use **Publish Now** on `/posts` for immediate

Statuses: `pending` → `processing` → `published` or `failed` (see error text on Posts page).

**YouTube:** Connect YouTube on `/social`, add a **video** in Studio (upload or https `.mp4` URL). Caption becomes the video description. Default visibility: `YOUTUBE_DEFAULT_PRIVACY=unlisted` in API `.env`.
