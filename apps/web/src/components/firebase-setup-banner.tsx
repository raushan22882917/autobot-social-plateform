'use client';

import { isFirebaseConfigured } from '@/lib/firebase';

export function FirebaseSetupBanner() {
  if (isFirebaseConfigured()) return null;

  return (
    <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
      <p className="font-semibold text-amber-200">Firebase Auth not configured</p>
      <p className="mt-1 text-amber-100/80">
        Add your Web app keys to <code className="text-xs">apps/web/.env.local</code> from{' '}
        <a
          href="https://console.firebase.google.com/project/autobot-founder/settings/general"
          target="_blank"
          rel="noreferrer"
          className="underline text-brand-instagram"
        >
          Firebase Console → Project settings → Your apps
        </a>
        . Also set <code className="text-xs">FIREBASE_WEB_API_KEY</code> in{' '}
        <code className="text-xs">services/api/.env</code>.
      </p>
      <p className="mt-2 text-xs text-amber-100/70">
        Run <code className="rounded bg-black/30 px-1">npm run firebase:check</code> after updating keys.
        See <code className="rounded bg-black/30 px-1">docs/FIREBASE_QUICKSTART.md</code> in the repo.
      </p>
    </div>
  );
}
