#!/bin/bash
# Trigger Vercel deployment via Deploy Hook
# Usage: ./trigger-deploy.sh <hook-url>

if [ -z "$1" ]; then
  echo "Usage: ./trigger-deploy.sh <vercel-deploy-hook-url>"
  echo ""
  echo "To get the hook URL:"
  echo "1. Go to Vercel Dashboard → Your Project → Settings → Git"
  echo "2. Scroll to 'Deploy Hooks' section"
  echo "3. Create a hook for branch: cursor/analyze-project-structure-and-health-ddb7"
  echo "4. Copy the hook URL"
  exit 1
fi

echo "🚀 Triggering Vercel deployment..."
curl -X POST "$1"
echo ""
echo "✅ Deployment triggered! Check Vercel dashboard for status."
