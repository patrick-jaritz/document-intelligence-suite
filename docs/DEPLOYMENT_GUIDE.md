# Collaboration Features - Complete Deployment Guide

## Overview

This guide covers the deployment of the collaboration features (GitHub Archive Comment Threads, Saved Views, and thepipe-service) to production.

**Status**: Phase 1 implementation complete (Tasks 1-8), ready for staging validation (Task 9) and production deployment (Task 10-12).

## Deployment Checklist

### Pre-Deployment (Task 8 - Integration Tests)
- [x] CommentPanel unit tests (15+ test cases)
- [x] Supabase integration tests (30+ test cases)
- [x] Smoke test suite (16 tests)
- [x] All migrations SQL syntax validated
- [x] RLS policies bug fixed
- [x] Edge Functions implemented with error handling
- [x] Frontend build successful
- [x] No regressions in existing tests

### Staging Validation (Task 9)
- [ ] Run validation script: `./scripts/validate-staging.sh`
- [ ] Test Edge Function endpoints with curl/Postman
- [ ] Test CommentPanel UI manually in browser
- [ ] Create test comments and verify display
- [ ] Test soft-delete functionality
- [ ] Verify team/private view access controls
- [ ] Monitor logs for errors
- [ ] Load test with concurrent users (optional)

### Production Deployment (Task 10)
- [ ] Create PR: `feature/collaboration` → `main`
- [ ] Verify CI workflow passes
- [ ] Code review completed
- [ ] Merge with squash commit
- [ ] Monitor Vercel deployment
- [ ] Verify production health endpoint
- [ ] Monitor Supabase logs for errors
- [ ] Setup alerts and monitoring

### Post-Deployment (Task 11-12)
- [ ] Health monitoring script active
- [ ] Deployment runbook documented
- [ ] Team trained on new features
- [ ] User documentation updated

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                     │
│  React 18 + TypeScript + Vite                           │
│  ┌────────────────────────────────────────────┐         │
│  │  GitHubAnalyzer                            │         │
│  │  ├─ CommentPanel (NEW)                     │         │
│  │  ├─ Archive Cards with Comments button     │         │
│  │  └─ Integration with existing UI           │         │
│  └────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Edge Functions (Supabase)                   │
│  TypeScript/Deno Runtime                                │
│  ┌──────────────────────────────────────────┐           │
│  │ /comment-thread          (NEW)           │           │
│  │ ├─ GET: Fetch thread for repository      │           │
│  │ └─ POST: Create/get thread               │           │
│  ├──────────────────────────────────────────┤           │
│  │ /comments                (NEW)           │           │
│  │ ├─ GET: Fetch comments with pagination   │           │
│  │ ├─ POST: Create comment                  │           │
│  │ ├─ PUT: Edit comment                     │           │
│  │ └─ DELETE: Soft-delete comment           │           │
│  ├──────────────────────────────────────────┤           │
│  │ /saved-views             (NEW)           │           │
│  │ ├─ GET: Fetch views (private/team/pub)   │           │
│  │ ├─ POST: Create view                     │           │
│  │ ├─ PUT: Update view                      │           │
│  │ └─ DELETE: Delete view                   │           │
│  └──────────────────────────────────────────┘           │
│  Auth: JWT verification, CORS headers, error handling   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL (Supabase)                       │
│  ┌──────────────────────────────────────────┐           │
│  │ comment_threads        (NEW)             │           │
│  │ ├─ id, repository_url, owner_id          │           │
│  │ ├─ team_id, created_at, updated_at       │           │
│  │ └─ RLS: Team-based access control        │           │
│  ├──────────────────────────────────────────┤           │
│  │ comments               (NEW)             │           │
│  │ ├─ id, thread_id, author_id              │           │
│  │ ├─ body, mentions[], timestamps          │           │
│  │ ├─ deleted_at (soft-delete)              │           │
│  │ └─ RLS: User can only delete own         │           │
│  ├──────────────────────────────────────────┤           │
│  │ saved_views            (NEW)             │           │
│  │ ├─ id, name, owner_id, team_id           │           │
│  │ ├─ visibility (private/team/public)      │           │
│  │ ├─ filters, role (owner/editor/viewer)   │           │
│  │ └─ RLS: Visibility-based access          │           │
│  └──────────────────────────────────────────┘           │
│  100+ RLS Policies for team-based security              │
└─────────────────────────────────────────────────────────┘
```

## Deployment Procedures

### 1. Staging Deployment

#### Step 1: Run Validation Script

```bash
# Make script executable
chmod +x scripts/validate-staging.sh

# Run validation
./scripts/validate-staging.sh

# Should output: ✓ Staging deployment validation complete!
```

#### Step 2: Manual Testing

```bash
# Test Edge Functions with curl
curl -X GET "http://localhost:54321/functions/v1/comment-thread?repository_url=https://github.com/test/repo" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"

# Test CommentPanel in browser
# Navigate to: http://localhost:3000
# Find archived repository, click "Comments" button
# Verify side panel opens, can type and post comments
```

#### Step 3: Create Test Data

```bash
# Test creating comment thread
curl -X POST "http://localhost:54321/functions/v1/comment-thread" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "repository_url": "https://github.com/test-owner/test-repo"
  }'

# Verify response contains thread_id
# Test posting comments to thread
```

#### Step 4: Verify Soft-Delete

```bash
-- In Supabase SQL Editor
SELECT * FROM comments WHERE thread_id = 'test-thread' AND deleted_at IS NULL;

-- Delete comment via API
-- Verify deleted_at is set, comment still in DB but not shown in UI
```

#### Step 5: Check Access Controls

```bash
-- Verify RLS policies are working
-- Login as different user
-- Try to access private views owned by another user (should fail)
-- Try to access team views (should succeed if team member)
-- Try to access public views (should always succeed)
```

### 2. Production Deployment

#### Step 1: Create Pull Request

```bash
# Update todo list
git checkout feature/collaboration
git log --oneline main..feature/collaboration

# Create PR on GitHub
# Title: "feat: add collaboration features (comment threads, saved views, thepipe-service)"
# Description: Link to COLLABORATION_IMPLEMENTATION_STATUS.md
```

#### Step 2: CI/CD Verification

```bash
# GitHub Actions should automatically run:
# - Lint (ESLint + Prettier)
# - Type checking (TypeScript)
# - Unit tests (Vitest)
# - Build (Vite)
# - Security scan (Dependabot)

# Wait for all checks to pass (green checkmarks)
```

#### Step 3: Code Review

- [ ] Review code changes
- [ ] Verify migration up/down procedures
- [ ] Check error handling and logging
- [ ] Verify security (JWT, RLS, CORS)
- [ ] Approve PR

#### Step 4: Merge to Main

```bash
# Merge with squash commit
git checkout main
git pull origin main
git merge --squash feature/collaboration
git commit -m "feat: add collaboration features

- Comment threads for archiving discussions
- Saved views with team/private/public visibility
- CommentPanel React component
- 3 new Edge Functions with full CRUD
- 3 database migrations with RLS policies
- Integration tests and smoke test suite

Closes #<issue-number>"

git push origin main
```

#### Step 5: Monitor Vercel Deployment

```bash
# Check Vercel dashboard
# https://vercel.com/dashboard

# Deployment should start automatically
# Wait for:
# - Build phase (4-5 minutes)
# - Deployment phase (2-3 minutes)
# - Production URL available

# Test production URL
curl https://document-intelligence-suite.vercel.app/health
# Should return: { "status": "ok" }
```

#### Step 6: Verify Production Health

```bash
# Run production health check
./scripts/monitor_health.sh production

# Check Supabase logs
# https://app.supabase.com → Logs → Edge Functions

# Monitor for errors:
# - 401 Unauthorized (auth issues)
# - 403 Forbidden (RLS violations)
# - 500 Internal Server Error (bugs)
```

### 3. Rollback Procedures

#### If Vercel Deployment Fails

```bash
# Vercel automatically keeps previous deployment
# Click "Promote to Production" on previous deployment
# Or redeploy from commit before merge
git revert <merge-commit-hash>
git push origin main
```

#### If Database Migration Fails

```bash
# SSH into Supabase
# Run down migration
psql -U postgres -d postgres -f "supabase/migrations/20251108003000_add_comment_threads_down.sql"

# Or via Supabase UI:
# Database → SQL Editor → Run rollback script
```

#### If Edge Functions Error

```bash
# Stop function deployment
# Revert function code to previous version
git revert <edge-function-commit-hash>
supabase functions deploy

# Or manually delete corrupted functions
rm -rf supabase/functions/comment-thread
rm -rf supabase/functions/comments
rm -rf supabase/functions/saved-views
git checkout supabase/functions/
supabase functions deploy
```

## Monitoring & Alerting

### 1. Health Monitoring

```bash
# Run continuous health monitoring
./scripts/monitor_health.sh

# Checks:
# - App health endpoint (every 30 seconds)
# - Supabase connection (every 60 seconds)
# - Database query performance (every 5 minutes)
# - Edge Function response times (every 60 seconds)
```

### 2. Log Monitoring

```bash
# Supabase Logs
# https://app.supabase.com → Logs → Edge Functions
# Filter by: comment-thread, comments, saved-views

# Monitor for patterns:
# - Repeated 401 errors (auth issues)
# - 403 errors (RLS violations)
# - Slow queries (performance)
# - Memory errors (edge function limits)
```

### 3. Alerts

```bash
# Setup Supabase alerts
# https://app.supabase.com → Settings → Alerts

# Critical alerts:
# - Edge Function error rate > 5%
# - Edge Function response time > 5 seconds
# - Database connection failures
# - Disk space usage > 90%
```

## Cost Analysis

### Monthly Costs (Production)

| Component | Estimate | Notes |
|-----------|----------|-------|
| Vercel Frontend | $20 | Hosting 81KB app |
| Supabase Edge Functions | $15 | 100K requests/month |
| Supabase Database | $25 | 5GB storage, PostgreSQL |
| thepipe-service (Railway) | $15 | Paid tier recommended |
| **Total** | **$75/month** | For 1,000+ daily active users |

### Scaling Estimates

- Up to 100,000 monthly users: ~$100/month
- Up to 1,000,000 monthly users: ~$500/month
- Enterprise: Custom pricing

## Troubleshooting

### Common Issues

#### 1. "Auth token expired" Error

```
Problem: CommentPanel shows "Token expired"
Solution: 
  - Clear browser localStorage
  - Re-login to app
  - Check localStorage token in DevTools
  - Verify Supabase auth configuration
```

#### 2. "403 Forbidden" on Comments

```
Problem: Cannot post comments even though logged in
Solution:
  - Check RLS policies in Supabase
  - Verify user team_id matches thread team_id
  - Check user auth token claims
  - Review Edge Function logs
```

#### 3. "Soft-delete not working"

```
Problem: Deleted comments still appear in UI
Solution:
  - Verify `deleted_at IS NULL` in comments query
  - Clear browser cache
  - Check database directly:
    SELECT * FROM comments WHERE deleted_at IS NOT NULL;
  - Restart frontend build
```

#### 4. "CommentPanel doesn't open"

```
Problem: Clicking Comments button doesn't show panel
Solution:
  - Check browser console for JavaScript errors
  - Verify CommentPanel component is imported
  - Check Redux state (if using Redux)
  - Verify Supabase URL is correct
  - Check CORS headers in network tab
```

#### 5. "Pagination not working"

```
Problem: Can't load more comments
Solution:
  - Check Edge Function pagination logic
  - Verify limit and offset parameters
  - Check database row count
  - Review pagination UI component
```

## Deployment Metrics

### Performance Targets

- Edge Function response time: < 500ms (p95)
- Database query time: < 100ms (p95)
- CommentPanel render time: < 1 second
- Full page load: < 3 seconds

### Success Criteria

- [ ] All smoke tests pass
- [ ] No new error logs in production
- [ ] CommentPanel response time < 500ms
- [ ] Zero RLS policy violations
- [ ] 100% feature availability (no 5xx errors)
- [ ] All integration tests pass in production

## Feature Flags

If needed to disable features in production:

```typescript
// Add to environment variables
VITE_ENABLE_COMMENTS=true
VITE_ENABLE_SAVED_VIEWS=true

// Check in component
if (!import.meta.env.VITE_ENABLE_COMMENTS) {
  return null; // Hide CommentPanel
}
```

## Documentation Updates

After deployment, update:

- [ ] User documentation with comment thread instructions
- [ ] API documentation with Edge Function specs
- [ ] Architecture diagram with new components
- [ ] Team wiki with deployment procedures
- [ ] Troubleshooting guide with common issues

## Contact & Support

For issues with deployment:

1. Check this guide first
2. Review logs in Supabase dashboard
3. Check Vercel deployment status
4. Review GitHub Actions CI logs
5. Contact DevOps team

---

**Last Updated**: 2025-01-08
**Version**: 1.0
**Status**: Ready for Production
