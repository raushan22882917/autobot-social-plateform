import { Router } from 'express';
import { verifyOAuthState } from './oauth-state';
import { assertPlatform, completeOAuth } from './oauth';
import { saveSocialAccount } from './social-service';
import { getWebAppUrl } from './config';

export const socialOAuthRouter = Router();

socialOAuthRouter.get('/callback/:platform', async (req, res) => {
  const web = getWebAppUrl();
  const platformParam = req.params.platform;

  try {
    const platform = assertPlatform(platformParam);
    const { code, state, error, error_description } = req.query;

    if (error) {
      const msg = String(error_description || error);
      return res.redirect(`${web}/social?error=${encodeURIComponent(msg)}`);
    }

    if (!code || !state) {
      return res.redirect(`${web}/social?error=${encodeURIComponent('OAuth was cancelled or incomplete')}`);
    }

    const ctx = verifyOAuthState(String(state));
    if (ctx.platform !== platform) {
      return res.redirect(`${web}/social?error=${encodeURIComponent('Invalid OAuth session')}`);
    }

    const input = await completeOAuth(platform, String(code), {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    });
    await saveSocialAccount(input);

    return res.redirect(`${web}/social?connected=${platform}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return res.redirect(`${web}/social?error=${encodeURIComponent(msg)}`);
  }
});
