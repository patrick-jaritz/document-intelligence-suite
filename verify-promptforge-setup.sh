#!/bin/bash
# Verification script for PromptForge setup

echo "🔍 Verifying PromptForge Setup..."
echo ""

# Check if migration file exists
if [ -f "supabase/migrations/20251116000000_create_promptforge_system.sql" ]; then
    echo "✅ Migration file exists"
else
    echo "❌ Migration file not found"
    exit 1
fi

# Check if Edge Functions exist
FUNCTIONS=("prompts" "execute-prompt" "executions")
ALL_FUNCTIONS_EXIST=true

for func in "${FUNCTIONS[@]}"; do
    if [ -f "supabase/functions/$func/index.ts" ]; then
        echo "✅ Edge Function '$func' exists"
    else
        echo "❌ Edge Function '$func' not found"
        ALL_FUNCTIONS_EXIST=false
    fi
done

if [ "$ALL_FUNCTIONS_EXIST" = false ]; then
    exit 1
fi

# Check if frontend files exist
FRONTEND_FILES=(
    "frontend/src/types/promptforge.ts"
    "frontend/src/services/promptForgeService.ts"
    "frontend/src/pages/PromptLibrary.tsx"
    "frontend/src/pages/PromptDetail.tsx"
    "frontend/src/components/prompts/PromptCard.tsx"
    "frontend/src/components/prompts/PromptExecutor.tsx"
    "frontend/src/components/prompts/ExecutionHistory.tsx"
    "frontend/src/components/prompts/VersionHistory.tsx"
)

ALL_FRONTEND_EXIST=true
for file in "${FRONTEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Frontend file '$file' exists"
    else
        echo "❌ Frontend file '$file' not found"
        ALL_FRONTEND_EXIST=false
    fi
done

if [ "$ALL_FRONTEND_EXIST" = false ]; then
    exit 1
fi

# Check if routes are added to App.tsx
if grep -q "PromptLibrary\|PromptDetail" frontend/src/App.tsx; then
    echo "✅ Routes added to App.tsx"
else
    echo "⚠️  Routes might not be added to App.tsx"
fi

# Check if navigation is added to Home.tsx
if grep -q "PromptForge\|/prompts" frontend/src/pages/Home.tsx; then
    echo "✅ Navigation added to Home.tsx"
else
    echo "⚠️  Navigation might not be added to Home.tsx"
fi

echo ""
echo "✅ All code files verified!"
echo ""
echo "📋 Next Steps:"
echo "   1. Apply database migration (see APPLY_MIGRATION.md)"
echo "   2. Deploy Edge Functions (run ./deploy-promptforge.sh)"
echo "   3. Set environment variables in Supabase Dashboard"
echo "   4. Test at /prompts"
