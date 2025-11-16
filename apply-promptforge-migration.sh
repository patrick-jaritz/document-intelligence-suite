#!/bin/bash

# Apply PromptForge Migration Script
# This script applies the PromptForge database schema migration

set -e

echo "🚀 Applying PromptForge Database Migration"
echo "=========================================="
echo ""

PROJECT_REF="joqnpibrfzqflyogrkht"
MIGRATION_FILE="supabase/migrations/20250116000000_create_promptforge_tables.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null && ! command -v npx &> /dev/null; then
    echo "❌ Supabase CLI not found"
    exit 1
fi

echo "📦 Applying migration..."
echo ""

# Try to apply via Supabase migration system
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    export SUPABASE_ACCESS_TOKEN
    # Create a temporary migration file with a later timestamp to ensure it runs
    TEMP_MIGRATION="supabase/migrations/$(date +%Y%m%d%H%M%S)_promptforge_tables.sql"
    cp "$MIGRATION_FILE" "$TEMP_MIGRATION"
    
    echo "✅ Migration file prepared: $TEMP_MIGRATION"
    echo ""
    echo "⚠️  Note: Due to existing migration conflicts, you may need to apply this manually:"
    echo ""
    echo "Option 1: Apply via Supabase Dashboard SQL Editor"
    echo "   1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql"
    echo "   2. Copy contents of: $MIGRATION_FILE"
    echo "   3. Paste and execute"
    echo ""
    echo "Option 2: Use psql directly"
    echo "   psql <connection_string> < $MIGRATION_FILE"
    echo ""
    echo "The migration creates these tables:"
    echo "  - workspaces"
    echo "  - workspace_members"
    echo "  - prompts"
    echo "  - prompt_versions"
    echo "  - executions"
    echo "  - packs"
    echo "  - pack_prompts"
    echo ""
else
    echo "⚠️  SUPABASE_ACCESS_TOKEN not set"
    echo "   Set it and run: export SUPABASE_ACCESS_TOKEN=your_token"
    echo "   Then run: npx supabase db push"
fi
