import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

let initialized = false;

function resolveCredPath(): string | undefined {
  const credPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  return credPath ? path.resolve(credPath) : undefined;
}

function isValidServiceAccountFile(credPath: string): boolean {
  try {
    const data = JSON.parse(readFileSync(credPath, 'utf8'));
    return Boolean(data.private_key && data.client_email && !data.web);
  } catch {
    return false;
  }
}

export function hasValidServiceAccount(): boolean {
  const credPath = resolveCredPath();
  return Boolean(credPath && existsSync(credPath) && isValidServiceAccountFile(credPath));
}

export function isFirebaseAdminEnabled(): boolean {
  if (process.env.FIRESTORE_EMULATOR_HOST) return true;

  if (process.env.USE_DEV_STORE !== 'true') {
    return (
      hasValidServiceAccount() ||
      Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    );
  }

  if (process.env.FORCE_FIREBASE_ADMIN === 'true') {
    return hasValidServiceAccount();
  }

  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    hasValidServiceAccount()
  );
}

export function initFirebaseAdmin(): typeof admin | null {
  if (!isFirebaseAdminEnabled()) return null;
  if (initialized && admin.apps.length) return admin;

  try {
    if (!admin.apps.length) {
      const projectId =
        process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'autobot-founder';

      if (process.env.FIRESTORE_EMULATOR_HOST) {
        admin.initializeApp({ projectId });
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const credPath = resolveCredPath()!;
        if (!existsSync(credPath)) throw new Error(`Service account not found: ${credPath}`);
        const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
        if (serviceAccount.web && !serviceAccount.private_key) {
          throw new Error(
            `${credPath} is a Google OAuth client JSON, not a Firebase service account. ` +
              'Download the service account key from Firebase Console → Project settings → Service accounts → Generate new private key.'
          );
        }
        if (!serviceAccount.private_key || !serviceAccount.client_email) {
          throw new Error(`Invalid service account JSON at ${credPath}`);
        }
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId || serviceAccount.project_id,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId || serviceAccount.project_id,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
      } else {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
      }
    }
    if (admin.apps.length) {
      admin.firestore().settings({ ignoreUndefinedProperties: true });
    }
    initialized = true;
    return admin;
  } catch (err) {
    console.warn('Firebase Admin init failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export function getFirebaseAuth() {
  const fb = initFirebaseAdmin();
  return fb ? fb.auth() : null;
}
