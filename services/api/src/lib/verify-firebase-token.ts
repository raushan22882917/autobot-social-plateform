import type { DecodedIdToken } from 'firebase-admin/auth';
import { getFirebaseAuth, isFirebaseAdminEnabled } from './firebase-admin';

/** Verify a Firebase ID token via Admin SDK or Identity Toolkit REST (dev fallback). */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  const adminAuth = getFirebaseAuth();
  if (adminAuth && isFirebaseAdminEnabled()) {
    return adminAuth.verifyIdToken(idToken);
  }

  if (process.env.USE_DEV_STORE !== 'true') {
    throw new Error('Firebase Admin not configured');
  }

  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Firebase Admin not configured. Add firebase-service-account.json or set FIREBASE_WEB_API_KEY for dev verification.'
    );
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  const data = (await res.json()) as {
    users?: Array<{
      localId: string;
      email?: string;
      displayName?: string;
      photoUrl?: string;
      providerUserInfo?: Array<{ providerId?: string }>;
    }>;
    error?: { message?: string };
  };

  if (!res.ok || !data.users?.[0]) {
    throw new Error(data.error?.message || 'Invalid or expired Firebase token');
  }

  const u = data.users[0];
  const provider = u.providerUserInfo?.[0]?.providerId || 'password';

  return {
    uid: u.localId,
    email: u.email,
    name: u.displayName,
    picture: u.photoUrl,
    firebase: { sign_in_provider: provider },
  } as DecodedIdToken;
}
