#!/usr/bin/env bash
# Deploy AutoBot360 web app to Vercel (monorepo: apps/web)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Checking Vercel CLI..."
if ! command -v vercel >/dev/null 2>&1; then
  echo "Install: npm i -g vercel"
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: vercel login"
  exit 1
fi

echo "==> Linking project (apps/web) if needed..."
if [[ ! -f apps/web/.vercel/project.json ]]; then
  vercel link --cwd apps/web --yes
fi

echo "==> Preparing Vercel env (API URL + Firebase from api .env)..."
node scripts/vercel-prepare-env.mjs
echo "==> Syncing NEXT_PUBLIC_* to Vercel..."
node scripts/vercel-sync-env.mjs

echo "==> Production deploy..."
vercel deploy --cwd apps/web --prod --yes

echo ""
echo "Done. Set NEXT_PUBLIC_API_URL in Vercel to your production API (Cloud Run / Railway)."
echo "The Express API (services/api) is not hosted on Vercel — deploy it separately."
