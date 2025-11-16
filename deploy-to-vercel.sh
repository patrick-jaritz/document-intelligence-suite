#!/bin/bash

# Deploy to Vercel by pushing to GitHub
# Vercel auto-deploys when code is pushed to GitHub

set -e

echo "🚀 Triggering Vercel Deployment"
echo "================================="
echo ""

CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"
echo ""

# Stage and commit any changes
if ! git diff-index --quiet HEAD --; then
    echo "📝 Committing changes..."
    git add -A
    git commit -m "chore: Trigger Vercel deployment - Update github-analyzer error handling" || echo "No changes to commit"
fi

# Push current branch (Vercel may deploy preview for feature branches)
echo "📤 Pushing to GitHub..."
git push origin "$CURRENT_BRANCH" || {
    echo "❌ Failed to push. Checking if branch exists on remote..."
    git push -u origin "$CURRENT_BRANCH"
}

echo ""
echo "✅ Code pushed to GitHub!"
echo ""
echo "📊 Deployment Status:"
echo "   - If Vercel is configured for branch '$CURRENT_BRANCH', a preview deployment will be created"
echo "   - For production deployment, merge to 'main' branch"
echo ""
echo "🌐 Monitor deployments:"
echo "   - Vercel Dashboard: https://vercel.com/dashboard"
echo "   - GitHub: https://github.com/patrick-jaritz/document-intelligence-suite"
echo ""
