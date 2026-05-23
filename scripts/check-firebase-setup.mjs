#!/usr/bin/env node
/**
 * Verifies Firebase service account + live Firestore access.
 * Run from repo root: npm run firebase:check
 */
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const credPath = resolve(root, 'firebase-service-account.json');
const webEnvPath = resolve(root, 'apps/web/.env.local');

function fail(msg) {
  console.error('\n❌', msg);
  process.exit(1);
}

function ok(msg) {
  console.log('✓', msg);
}

function warn(msg) {
  console.warn('⚠', msg);
}

if (!existsSync(credPath)) {
  fail(
    `Missing ${credPath}\n\n` +
      '1. Open https://console.firebase.google.com/project/autobot-founder/settings/serviceaccounts/adminsdk\n' +
      '2. Click "Generate new private key"\n' +
      '3. Save as firebase-service-account.json in the repo root\n'
  );
}

let data;
try {
  data = JSON.parse(readFileSync(credPath, 'utf8'));
} catch {
  fail('firebase-service-account.json is not valid JSON');
}

if (data.web && !data.private_key) {
  fail(
    'firebase-service-account.json is a Google OAuth web client, not a service account.\n' +
      'Download the Admin SDK key from Firebase Console → Service accounts.'
  );
}

if (!data.private_key || !data.client_email) {
  fail('firebase-service-account.json must include private_key and client_email');
}

ok(`Service account: ${data.client_email}`);
ok(`Project: ${data.project_id || 'autobot-founder'}`);

// Live Firestore test
try {
  const admin = (await import('firebase-admin')).default;
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(data),
      projectId: data.project_id || 'autobot-founder',
    });
  }
  await admin.firestore().collection('_health').limit(1).get();
  ok('Firestore connection: OK');
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  const hint = msg.includes('Invalid JWT') || msg.includes('UNAUTHENTICATED')
    ? 'The private key in firebase-service-account.json does not match Google (revoked or corrupted). You must download a NEW key — editing the file will not work.\n'
    : '';
  fail(
    `Firestore connection failed: ${msg}\n\n` +
      hint +
      '1. Firebase Console → autobot-founder → Project settings → Service accounts\n' +
      '2. Generate NEW private key → replace firebase-service-account.json at repo root\n' +
      '3. Ensure Firestore is enabled: https://console.firebase.google.com/project/autobot-founder/firestore\n' +
      '4. Run: npm run firebase:check\n'
  );
}

// Web client env check
if (existsSync(webEnvPath)) {
  const webEnv = readFileSync(webEnvPath, 'utf8');
  const hasApiKey = /^NEXT_PUBLIC_FIREBASE_API_KEY=.+$/m.test(webEnv) &&
    !/^NEXT_PUBLIC_FIREBASE_API_KEY=\s*$/m.test(webEnv);
  const hasAppId = /^NEXT_PUBLIC_FIREBASE_APP_ID=.+$/m.test(webEnv) &&
    !/^NEXT_PUBLIC_FIREBASE_APP_ID=\s*$/m.test(webEnv);
  if (hasApiKey && hasAppId) {
    ok('apps/web/.env.local: Firebase client keys present');
  } else {
    warn('apps/web/.env.local: missing NEXT_PUBLIC_FIREBASE_API_KEY or APP_ID');
    console.log('\nAdd Web SDK config from Firebase Console → Project settings → General → Your apps');
    console.log('Also set FIREBASE_WEB_API_KEY in services/api/.env (same Web API Key)\n');
  }
} else {
  warn('apps/web/.env.local not found — copy from apps/web/.env.example');
}

console.log('\nWhen both checks pass, restart: npm run dev');
console.log('Login page should show "Firebase auth" (not Dev auth mode)\n');
