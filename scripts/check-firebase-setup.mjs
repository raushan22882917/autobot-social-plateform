#!/usr/bin/env node
/**
 * Verifies Firebase service account + Firestore before starting the API.
 * Run from repo root: node scripts/check-firebase-setup.mjs
 */
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const credPath = resolve(root, 'firebase-service-account.json');

function fail(msg) {
  console.error('\n❌', msg);
  process.exit(1);
}

function ok(msg) {
  console.log('✓', msg);
}

if (!existsSync(credPath)) {
  fail(
    `Missing ${credPath}\n\n` +
      '1. Open https://console.firebase.google.com/project/autobot-founder/settings/serviceaccounts/adminsdk\n' +
      '2. Click "Generate new private key"\n' +
      '3. Save the file as firebase-service-account.json in the repo root\n' +
      '4. Ensure services/api/.env has USE_DEV_STORE=false\n'
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
console.log('\nNext: restart API → cd services/api && npx tsx src/index.ts');
console.log('Expected log: Firestore connected (autobot-founder)\n');
