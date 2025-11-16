#!/bin/bash

# Deploy github-analyzer Edge Function to Supabase
# This script handles deployment with proper error handling

set -e

PROJECT_REF="joqnpibrfzqflyogrkht"
FUNCTION_NAME="github-analyzer"

echo "🚀 Deploying $FUNCTION_NAME to Supabase..."
echo "Project: $PROJECT_REF"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null && ! command -v npx &> /dev/null; then
    echo "❌ Error: Supabase CLI not found. Please install it:"
    echo "   npm install -g supabase"
    exit 1
fi

# Try to deploy using npx supabase (works without global install)
echo "📦 Attempting deployment..."
echo ""

# Use npx to ensure we have the latest version
if npx supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF; then
    echo ""
    echo "✅ Successfully deployed $FUNCTION_NAME!"
    echo ""
    echo "🌐 Function URL: https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME"
    echo ""
    echo "📊 Monitor at: https://supabase.com/dashboard/project/$PROJECT_REF/functions"
    exit 0
else
    EXIT_CODE=$?
    echo ""
    echo "⚠️  Deployment failed. This usually means:"
    echo "   1. You need to authenticate with Supabase"
    echo "   2. Or set SUPABASE_ACCESS_TOKEN environment variable"
    echo ""
    echo "To fix this, run one of the following:"
    echo ""
    echo "Option 1 - Login interactively:"
    echo "   npx supabase login"
    echo "   npx supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF"
    echo ""
    echo "Option 2 - Use access token:"
    echo "   export SUPABASE_ACCESS_TOKEN=your_token_here"
    echo "   npx supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF"
    echo ""
    echo "Get your access token from: https://supabase.com/dashboard/account/tokens"
    exit $EXIT_CODE
fi
