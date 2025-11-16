#!/bin/bash

# Trigger Vercel Deployment via API
# This script can be used if GitHub webhooks aren't working

set -e

echo "🚀 Triggering Vercel Deployment via API"
echo "=========================================="
echo ""

# Check if VERCEL_TOKEN is set
if [ -z "$VERCEL_TOKEN" ]; then
    echo "⚠️  VERCEL_TOKEN environment variable not set"
    echo ""
    echo "To use this script:"
    echo "1. Get your Vercel token from: https://vercel.com/account/tokens"
    echo "2. Set it as an environment variable:"
    echo "   export VERCEL_TOKEN=your_token_here"
    echo "3. Run this script again"
    echo ""
    echo "Alternatively, you can trigger deployment manually:"
    echo "1. Go to: https://vercel.com/dashboard"
    echo "2. Find your project: document-intelligence-suite"
    echo "3. Click 'Redeploy' on the latest deployment"
    echo ""
    exit 1
fi

# Get project info (you may need to adjust these)
PROJECT_NAME="document-intelligence-suite"
TEAM_ID="${VERCEL_TEAM_ID:-}"

echo "📦 Project: $PROJECT_NAME"
echo ""

# Trigger deployment
if [ -n "$TEAM_ID" ]; then
    DEPLOY_URL="https://api.vercel.com/v13/deployments?project=$PROJECT_NAME&teamId=$TEAM_ID"
else
    DEPLOY_URL="https://api.vercel.com/v13/deployments?project=$PROJECT_NAME"
fi

echo "🔄 Triggering deployment..."
RESPONSE=$(curl -s -X POST "$DEPLOY_URL" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"gitSource":{"type":"github","repo":"patrick-jaritz/document-intelligence-suite","ref":"main"}}')

if echo "$RESPONSE" | grep -q "url"; then
    echo "✅ Deployment triggered successfully!"
    echo ""
    echo "$RESPONSE" | grep -o '"url":"[^"]*"' | head -1 | sed 's/"url":"/🌐 Deployment URL: /' | sed 's/"$//'
else
    echo "❌ Failed to trigger deployment"
    echo "Response: $RESPONSE"
    echo ""
    echo "Common issues:"
    echo "1. Invalid VERCEL_TOKEN"
    echo "2. Project not found or not linked to GitHub"
    echo "3. Need to set VERCEL_TEAM_ID if using a team"
    exit 1
fi

echo ""
echo "📊 Monitor deployment: https://vercel.com/dashboard"
