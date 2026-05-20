# Social OAuth setup

## Redirect URIs

Add these in each provider console (`API_PUBLIC_URL` defaults to `http://localhost:8081`):

| Platform | Redirect URI |
|----------|----------------|
| Instagram | `http://localhost:8081/api/v1/social/oauth/callback/instagram` |
| Facebook | `http://localhost:8081/api/v1/social/oauth/callback/facebook` |
| YouTube | `http://localhost:8081/api/v1/social/oauth/callback/youtube` |
| TikTok | `http://localhost:8081/api/v1/social/oauth/callback/tiktok` |
| LinkedIn | `http://localhost:8081/api/v1/social/oauth/callback/linkedin` |

## LinkedIn

1. [LinkedIn Developers](https://www.linkedin.com/developers/apps) → Create app
2. **Auth** tab → add redirect URL above
3. **Products** → request:
   - **Sign In with LinkedIn using OpenID Connect**
   - **Share on LinkedIn** (for `w_member_social`)
4. Optional (company page posting): **Marketing Developer Platform** + scopes `r_organization_social` `w_organization_social`

```env
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=
# Optional — company pages need organization scopes:
# LINKEDIN_OAUTH_SCOPES=openid profile email w_member_social r_organization_social w_organization_social
```

Restart the API after updating `.env`.

## Meta, Google, TikTok

See `.migration-backup/docs/SOCIAL_OAUTH_SETUP.md` or `services/api/.env.example`.
