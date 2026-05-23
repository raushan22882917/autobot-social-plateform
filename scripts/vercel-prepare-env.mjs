#!/usr/bin/env node
/**
 * Build apps/web/.env.vercel-deploy from .env.local, .env.example, and services/api/.env
 * (maps FIREBASE_WEB_API_KEY → NEXT_PUBLIC_FIREBASE_API_KEY, etc.)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_URL = 'https://autobot-api-dcmdkar57a-el.a.run.app/api/v1';

const sources = [
  resolve(root, 'apps/web/.env.example'),
  resolve(root, 'services/api/.env'),
  resolve(root, 'apps/web/.env.local'),
];

const map = {
  FIREBASE_WEB_API_KEY: 'NEXT_PUBLIC_FIREBASE_API_KEY',
};

function parse(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const merged = {};
for (const src of sources) Object.assign(merged, parse(src));

const vercel = {
  NEXT_PUBLIC_API_URL: API_URL,
  NEXT_PUBLIC_FIREBASE_API_KEY: merged.NEXT_PUBLIC_FIREBASE_API_KEY || merged.FIREBASE_WEB_API_KEY || '',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    merged.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${merged.FIREBASE_PROJECT_ID || 'autobot-founder'}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: merged.NEXT_PUBLIC_FIREBASE_PROJECT_ID || merged.FIREBASE_PROJECT_ID || 'autobot-founder',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    merged.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || merged.FIREBASE_STORAGE_BUCKET || 'autobot-founder.firebasestorage.app',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: merged.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  NEXT_PUBLIC_FIREBASE_APP_ID: merged.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  NEXT_PUBLIC_RAZORPAY_KEY_ID: merged.NEXT_PUBLIC_RAZORPAY_KEY_ID || merged.RAZORPAY_KEY_ID || '',
};

const missing = Object.entries(vercel).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.warn('Warning: empty values for:', missing.join(', '));
}

const lines = Object.entries(vercel).map(([k, v]) => `${k}=${v}`);
const outPath = resolve(root, 'apps/web/.env.vercel-deploy');
writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
console.log(`Wrote ${outPath}`);
for (const k of Object.keys(vercel)) console.log(`  ${k}=${vercel[k] ? '(set)' : '(empty)'}`);
