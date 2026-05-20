'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api';

interface GoogleOAuthSetup {
  firebaseLoginRedirect: string;
  youtubeRedirect: string;
  redirectUris: string[];
  javascriptOrigins: string[];
  consoleUrl: string;
}

export function GoogleOAuthSetupHelp({ context }: { context: 'login' | 'social' }) {
  const [setup, setSetup] = useState<GoogleOAuthSetup | null>(null);

  useEffect(() => {
    apiClient
      .getAuthConfig()
      .then((c) => {
        const g = (c as { googleOAuth?: GoogleOAuthSetup }).googleOAuth;
        if (g) setSetup(g);
      })
      .catch(() => {});
  }, []);

  if (!setup) return null;

  return (
    <motion.div
      layout
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100/90 space-y-2"
    >
      <p className="font-medium text-amber-200">
        Google error 400: redirect_uri_mismatch — add these in{' '}
        <a className="underline text-violet-300" href={setup.consoleUrl} target="_blank" rel="noreferrer">
          Google Cloud → Credentials → OAuth Web client
        </a>
      </p>
      {context === 'login' && (
        <p>
          For <strong>Continue with Google</strong> (login), add these under <strong>Authorized redirect URIs</strong>:
        </p>
      )}
      {context === 'social' && (
        <p>
          For <strong>YouTube connect</strong>, add these under <strong>Authorized redirect URIs</strong> (include the
          Firebase URI if you use Google login too):
        </p>
      )}
      <ul className="list-inside list-disc font-mono text-[11px] break-all">
        {setup.redirectUris.map((uri) => (
          <li key={uri}>{uri}</li>
        ))}
      </ul>
      <p className="pt-1">
        Under <strong>Authorized JavaScript origins</strong>, add:
      </p>
      <ul className="list-inside list-disc font-mono text-[11px] break-all">
        {setup.javascriptOrigins.map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ul>
      <p className="text-muted-foreground">
        Use the same OAuth client as Firebase (Web client for project autobot-founder). Save, wait ~1 minute, then try
        again.
      </p>
    </motion.div>
  );
}
