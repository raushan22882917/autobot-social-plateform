import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/** services/api/.env (this file lives in services/api/src/lib) */
const API_ENV_PATH = path.resolve(__dirname, '../../.env');

/** Re-read services/api/.env so UI updates after editing credentials without restarting the API. */
export function reloadApiEnv(): void {
  if (!fs.existsSync(API_ENV_PATH)) return;
  dotenv.config({ path: API_ENV_PATH, override: true });
}

/** First non-empty trimmed value for the given keys (supports common .env aliases). */
export function envValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = process.env[key];
    if (raw == null) continue;
    const trimmed = String(raw).trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

export function hasEnv(...keys: string[]): boolean {
  return envValue(...keys) !== undefined;
}
