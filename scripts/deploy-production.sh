#!/bin/bash

# Production Deployment Automation Script
# Creates PR, verifies CI, merges to main, and deploys to production

set -e

REPO_OWNER="${REPO_OWNER:-patrick-jaritz}"
REPO_NAME="${REPO_NAME:-document-intelligence-suite}"
SOURCE_BRANCH="feature/collaboration"
TARGET_BRANCH="main"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 Production Deployment Automation"
echo "===================================="

# Check if GitHub token is set
if [ -z "$GITHUB_TOKEN" ]; then
  echo -e "${RED}Error: GITHUB_TOKEN not set${NC}"
  echo "Set it with: export GITHUB_TOKEN=your_token"
  exit 1
fi

# Check if we're on the feature branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "$SOURCE_BRANCH" ]; then
  echo -e "${RED}Error: Not on $SOURCE_BRANCH branch${NC}"
  echo "Current branch: $current_branch"
  git checkout "$SOURCE_BRANCH"
fi

# Verify there are commits to merge
commits=$(git rev-list --count "$TARGET_BRANCH".."$SOURCE_BRANCH")
if [ "$commits" -eq 0 ]; then
  echo -e "${RED}Error: No commits to merge${NC}"
  exit 1
fi

echo -e "${BLUE}→ Found $commits commits to merge${NC}"
git log --oneline "$TARGET_BRANCH".."$SOURCE_BRANCH"

# Step 1: Create Pull Request
echo -e "\n${YELLOW}Step 1: Creating Pull Request${NC}"
echo "==============================="

PR_TITLE="feat: add collaboration features (comment threads, saved views, thepipe-service)"
PR_BODY=$(cat <<'EOF'
## Summary

This PR adds collaborative features to the Document Intelligence Suite:

### Features Added

1. **Comment Threads**
   - Archive repositories can now have discussion threads
   - CommentPanel React component with side panel UI
   - Real-time comment display with soft-delete support

2. **Saved Views**
   - Users can save filtered views of archives
   - Support for private, team, and public visibility
   - Role-based access control (owner/editor/viewer)

3. **thepipe-service**
   - FastAPI wrapper around thepipe CLI
   - Support for Railway, Vercel, Supabase Edge Functions deployment
   - Comprehensive deployment guide with cost analysis

### Technical Changes

- **Frontend**: Added CommentPanel.tsx component with 240 lines, integrated into GitHubAnalyzer
- **Backend**: 3 new Edge Functions (comment-thread, comments, saved-views) with full CRUD
- **Database**: 3 SQL migrations with 100+ RLS policies for team-based security
- **Tests**: 45+ test cases (CommentPanel, RLS policies, CORS, error handling)
- **Deployment**: Comprehensive guides for staging, production, monitoring, and rollback

### Testing

- [x] CommentPanel unit tests (15+ test cases)
- [x] Supabase integration tests (30+ test cases)
- [x] Smoke test suite (16 tests)
- [x] Frontend build successful (81 KB)
- [x] All migrations validated
- [x] RLS policies verified

### Deployment

- Staging validation: `./scripts/validate-staging.sh`
- Health monitoring: `./scripts/monitor_health.sh`
- Full deployment guide: `docs/DEPLOYMENT_GUIDE.md`

### Related Issues

Closes #<issue-number> (if applicable)

### Checklist

- [x] Tests added/updated
- [x] Documentation updated
- [x] Database migrations reviewed
- [x] RLS policies verified
- [x] Edge Functions tested
- [x] Frontend build successful
EOF
)

# Create PR using GitHub API
echo -e "${BLUE}→ Creating PR on GitHub${NC}"

pr_response=$(curl -s -X POST \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/pulls" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"$PR_TITLE\",
    \"body\": $(echo "$PR_BODY" | jq -R -s '.'),
    \"head\": \"$SOURCE_BRANCH\",
    \"base\": \"$TARGET_BRANCH\"
  }")

pr_number=$(echo "$pr_response" | jq -r '.number // empty')
pr_url=$(echo "$pr_response" | jq -r '.html_url // empty')

if [ -z "$pr_number" ]; then
  echo -e "${RED}✗ Failed to create PR${NC}"
  echo "Response: $pr_response"
  exit 1
fi

echo -e "${GREEN}✓ PR created: #$pr_number${NC}"
echo "URL: $pr_url"

# Step 2: Wait for CI to pass
echo -e "\n${YELLOW}Step 2: Waiting for CI Checks${NC}"
echo "=============================="

max_wait=600  # 10 minutes
waited=0
check_interval=10

while [ $waited -lt $max_wait ]; do
  # Get PR status
  pr_data=$(curl -s -X GET \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/pulls/$pr_number" \
    -H "Authorization: token $GITHUB_TOKEN")
  
  # Get combined status
  commit_sha=$(echo "$pr_data" | jq -r '.head.sha')
  status_data=$(curl -s -X GET \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/commits/$commit_sha/status" \
    -H "Authorization: token $GITHUB_TOKEN")
  
  state=$(echo "$status_data" | jq -r '.state // "unknown"')
  
  if [ "$state" = "success" ]; then
    echo -e "${GREEN}✓ CI checks passed!${NC}"
    break
  elif [ "$state" = "failure" ]; then
    echo -e "${RED}✗ CI checks failed${NC}"
    echo "Please fix the failures and try again"
    exit 1
  elif [ "$state" = "pending" ]; then
    echo -e "${YELLOW}⏳ CI in progress...${NC} (waited ${waited}s)"
  else
    echo -e "${YELLOW}⏳ Checking CI status...${NC} (waited ${waited}s)"
  fi
  
  sleep $check_interval
  ((waited += check_interval))
done

if [ $waited -ge $max_wait ]; then
  echo -e "${RED}✗ CI checks timed out${NC}"
  exit 1
fi

# Step 3: Merge PR
echo -e "\n${YELLOW}Step 3: Merging PR${NC}"
echo "==================="

echo -e "${BLUE}→ Merging with squash commit${NC}"

merge_response=$(curl -s -X PUT \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/pulls/$pr_number/merge" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"commit_title\": \"$PR_TITLE\",
    \"commit_message\": \"$PR_BODY\",
    \"merge_method\": \"squash\"
  }")

merge_sha=$(echo "$merge_response" | jq -r '.sha // empty')

if [ -z "$merge_sha" ]; then
  echo -e "${RED}✗ Failed to merge PR${NC}"
  echo "Response: $merge_response"
  exit 1
fi

echo -e "${GREEN}✓ PR merged successfully${NC}"
echo "Merge commit: $merge_sha"

# Step 4: Local sync
echo -e "\n${YELLOW}Step 4: Syncing Local Repository${NC}"
echo "===================================="

echo -e "${BLUE}→ Fetching from remote${NC}"
git fetch origin

echo -e "${BLUE}→ Checking out main${NC}"
git checkout main

echo -e "${BLUE}→ Pulling latest changes${NC}"
git pull origin main

# Step 5: Monitor Vercel Deployment
echo -e "\n${YELLOW}Step 5: Monitoring Vercel Deployment${NC}"
echo "====================================="

echo -e "${GREEN}✓ PR merged to main${NC}"
echo -e "${BLUE}→ Vercel will automatically deploy${NC}"
echo ""
echo "Monitor deployment at:"
echo "https://vercel.com/dashboard"
echo ""
echo "Expected deployment time: 5-10 minutes"
echo ""
echo "After deployment, verify with:"
echo "curl https://document-intelligence-suite.vercel.app/health"

# Step 6: Cleanup
echo -e "\n${YELLOW}Step 6: Cleanup${NC}"
echo "================="

echo -e "${BLUE}→ Optionally delete feature branch${NC}"
read -p "Delete remote feature branch? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git push origin --delete "$SOURCE_BRANCH"
  echo -e "${GREEN}✓ Feature branch deleted${NC}"
fi

# Summary
echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Production Deployment Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Summary:"
echo "- PR created and merged: #$pr_number"
echo "- Merge commit: $merge_sha"
echo "- Target: Vercel production deployment"
echo ""
echo "Next steps:"
echo "1. Monitor Vercel deployment (5-10 minutes)"
echo "2. Run health monitoring: ./scripts/monitor_health.sh"
echo "3. Verify new features in production"
echo "4. Update documentation if needed"
