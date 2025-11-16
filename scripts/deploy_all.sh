#!/usr/bin/env bash
set -euo pipefail

# Pre-deploy script: runs Supabase migrations/functions then deploys frontend to Vercel.
# Assumes: supabase CLI logged in and linked, vercel CLI logged in, env vars set in Vercel/Supabase.

REPO_ROOT=$(dirname "$0")/..
cd "$REPO_ROOT"

echo "Running Supabase migrations (supabase db push)..."
if command -v supabase >/dev/null 2>&1; then
  supabase db push
  echo "Deploying Supabase functions..."
  supabase functions deploy --no-confirm || true
else
  echo "supabase CLI not found; skipping migrations/functions. Install supabase CLI to run them."
fi

echo "Building frontend..."
cd frontend
npm install
npm run build

echo "Deploying frontend to Vercel (production)..."
if command -v vercel >/dev/null 2>&1; then
  vercel --prod --confirm
else
  echo "vercel CLI not found; skipping deploy. Install vercel CLI to run live deploys."
fi

echo "Done."
