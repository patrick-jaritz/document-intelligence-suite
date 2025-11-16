#!/bin/bash
# Deployment script for PromptForge Edge Functions

set -e

echo "🚀 Deploying PromptForge Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase. Please run: supabase login"
    exit 1
fi

# Deploy functions
echo "📦 Deploying prompts function..."
supabase functions deploy prompts

echo "📦 Deploying execute-prompt function..."
supabase functions deploy execute-prompt

echo "📦 Deploying executions function..."
supabase functions deploy executions

echo "✅ All Edge Functions deployed successfully!"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Run the database migration in Supabase Dashboard → SQL Editor"
echo "   2. Set environment variables in Supabase Dashboard → Edge Functions → Settings:"
echo "      - SUPABASE_URL"
echo "      - SUPABASE_SERVICE_ROLE_KEY"
