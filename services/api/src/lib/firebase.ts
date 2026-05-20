// Re-export Firebase Admin helpers + Firestore accessor
export {
  initFirebaseAdmin as initFirebase,
  isFirebaseAdminEnabled,
  getFirebaseAuth,
  hasValidServiceAccount,
} from './firebase-admin';

import { initFirebaseAdmin } from './firebase-admin';

/** Direct Firestore access (prefer `db` from ./db for collection helpers). */
export function getDb() {
  const fb = initFirebaseAdmin();
  if (!fb) {
    throw new Error(
      'Firebase Admin not configured. Add firebase-service-account.json — see docs/FIREBASE_SETUP.md'
    );
  }
  return fb.firestore();
}
