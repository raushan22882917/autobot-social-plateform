/** URIs to register on the Google Cloud OAuth 2.0 Web client (used by Firebase Auth + YouTube). */

function getAuthDomain(): string {
  return (
    process.env.FIREBASE_AUTH_DOMAIN ||
    `${process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID || 'autobot-founder'}.firebaseapp.com`
  ).replace(/^https?:\/\//, '');
}

function getApiBaseUrl(): string {
  return (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 8081}`).replace(/\/$/, '');
}

function getWebAppUrl(): string {
  return (process.env.PUBLIC_URL || 'http://localhost:3001').replace(/\/$/, '');
}

export function getGoogleOAuthSetup() {
  const authDomain = getAuthDomain();
  const webUrl = getWebAppUrl();
  const apiBase = getApiBaseUrl();

  const javascriptOrigins = [
    ...new Set([
      webUrl,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      `https://${authDomain}`,
    ]),
  ];

  const redirectUris = [
    `https://${authDomain}/__/auth/handler`,
    `${apiBase}/api/v1/social/oauth/callback/youtube`,
  ];

  return {
    authDomain,
    redirectUris,
    javascriptOrigins,
    /** Fix redirect_uri_mismatch on login — Firebase Google sign-in */
    firebaseLoginRedirect: `https://${authDomain}/__/auth/handler`,
    /** Fix redirect_uri_mismatch on /social YouTube connect */
    youtubeRedirect: `${apiBase}/api/v1/social/oauth/callback/youtube`,
    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
  };
}
