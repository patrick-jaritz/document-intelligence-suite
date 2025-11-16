#!/bin/bash

# Trigger Vercel Deployment
# Vercel auto-deploys when pushing to the main branch

set -e

echo "🚀 Triggering Vercel Deployment"
echo "================================="
echo ""

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"
echo ""

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "   Committing changes..."
    git add -A
    git commit -m "chore: Trigger Vercel deployment - Update github-analyzer error handling" || echo "No changes to commit"
fi

# Check current branch
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "ℹ️  You're on branch: $CURRENT_BRANCH"
    echo "   Vercel typically deploys from 'main' branch"
    echo ""
    echo "Options:"
    echo "  1. Push current branch (if Vercel is configured for this branch)"
    echo "  2. Merge to main and push (triggers production deployment)"
    echo ""
    read -p "Push current branch? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📤 Pushing to origin/$CURRENT_BRANCH..."
        git push origin "$CURRENT_BRANCH"
        echo ""
        echo "✅ Pushed to GitHub. Vercel will auto-deploy if configured for this branch."
    else
        echo "⏭️  Skipping push. To trigger deployment manually:"
        echo "   git push origin $CURRENT_BRANCH"
        echo "   or merge to main: git checkout main && git merge $CURRENT_BRANCH && git push origin main"
    fi
else
    echo "📤 Pushing to main branch (triggers Vercel production deployment)..."
    git push origin main
    echo ""
    echo "✅ Pushed to GitHub. Vercel will auto-deploy in ~2-5 minutes."
    echo ""
    echo "🌐 Monitor deployment: https://vercel.com/dashboard"
fi

echo ""
echo "📊 Deployment Status:"
echo "   - GitHub: https://github.com/patrick-jaritz/document-intelligence-suite"
echo "   - Vercel Dashboard: https://vercel.com/dashboard"
echo ""
