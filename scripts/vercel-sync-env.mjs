#!/usr/bin/env node
/**
 * Sync apps/web/.env.local → Vercel project env vars (production, preview, development).
 * Usage: node scripts/vercel-sync-env.mjs [--dry-run]
 * Requires: vercel login, project linked (run from repo root: vercel link --cwd apps/web)
 */
import { readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, 'apps/web/.env.local');
const dryRun = process.argv.includes('--dry-run');

const ALLOWED_PREFIXES = ['NEXT_PUBLIC_'];

function parseEnvFile(path) {
  if (!existsSync(path)) {
    console.error(`Missing ${path} — copy from apps/web/.env.example and fill values.`);
    process.exit(1);
  }
  const vars = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!ALLOWED_PREFIXES.some((p) => key.startsWith(p))) continue;
    if (!val) {
      console.warn(`Skip empty: ${key}`);
      continue;
    }
    vars[key] = val;
  }
  return vars;
}

function vercelEnvAdd(key, value, envName) {
  const args = [
    'env', 'add', key, envName,
    '--cwd', resolve(root, 'apps/web'),
    '--value', value,
    '--yes', '--force',
  ];
  if (dryRun) {
    console.log(`[dry-run] vercel ${args.slice(0, -2).join(' ')} ... (len ${value.length})`);
    return true;
  }
  const r = spawnSync('vercel', args, {
    encoding: 'utf8',
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  return r.status === 0;
}

const vars = parseEnvFile(envPath);
const keys = Object.keys(vars);
if (keys.length === 0) {
  console.error('No NEXT_PUBLIC_* variables found in apps/web/.env.local');
  process.exit(1);
}

console.log(`Syncing ${keys.length} variables to Vercel (production, preview, development)...`);
const targets = ['production', 'preview', 'development'];
let ok = 0;
let fail = 0;

for (const key of keys) {
  for (const env of targets) {
    process.stdout.write(`  ${key} [${env}] ... `);
    if (vercelEnvAdd(key, vars[key], env)) {
      console.log('ok');
      ok++;
    } else {
      console.log('FAILED');
      fail++;
    }
  }
}

console.log(`\nDone: ${ok} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
