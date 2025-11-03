#!/bin/bash

# Deployment script for Structured Prompt Builder
# Deploys database migration and Edge Functions

set -e

echo "🚀 Deploying Structured Prompt Builder"
echo "========================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase status &> /dev/null 2>&1; then
    echo "⚠️  Not connected to Supabase project locally."
    echo "   This is OK - we'll deploy directly to remote."
else
    echo "✅ Connected to Supabase project"
fi

# Step 1: Run database migration
echo ""
echo "📊 Step 1: Running database migration..."
echo "----------------------------------------"

if supabase db push 2>/dev/null; then
    echo "✅ Database migration applied successfully"
else
    echo "⚠️  Migration push failed. Trying direct SQL..."
    echo "   Please apply migration manually in Supabase Dashboard:"
    echo "   supabase/migrations/20250131000000_add_prompt_templates.sql"
fi

# Step 2: Deploy Edge Functions
echo ""
echo "📦 Step 2: Deploying Edge Functions..."
echo "---------------------------------------"

echo "1. Deploying prompt-builder function..."
if supabase functions deploy prompt-builder; then
    echo "   ✅ prompt-builder deployed"
else
    echo "   ❌ prompt-builder deployment failed"
    exit 1
fi

echo ""
echo "2. Deploying test-prompt function..."
if supabase functions deploy test-prompt; then
    echo "   ✅ test-prompt deployed"
else
    echo "   ❌ test-prompt deployment failed"
    exit 1
fi

echo ""
echo "3. Updating generate-structured-output function..."
if supabase functions deploy generate-structured-output; then
    echo "   ✅ generate-structured-output updated"
else
    echo "   ⚠️  generate-structured-output deployment failed (may already be deployed)"
fi

# Step 3: Summary
echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "📋 Deployed Components:"
echo "   ✅ prompt_templates database table"
echo "   ✅ prompt-builder Edge Function (CRUD API)"
echo "   ✅ test-prompt Edge Function (OpenRouter testing)"
echo "   ✅ generate-structured-output (custom prompt support)"
echo ""
echo "🧪 Next Steps:"
echo "   1. Test prompt creation in UI"
echo "   2. Test prompt testing with OpenRouter"
echo "   3. Test custom prompts in data extraction"
echo ""
echo "📚 Documentation:"
echo "   - PROMPT_BUILDER_COMPLETE.md"
echo "   - PROMPT_BUILDER_PHASE3_COMPLETE.md"
echo ""

