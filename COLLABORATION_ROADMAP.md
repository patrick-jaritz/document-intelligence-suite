# Collaboration Features Roadmap

**Status**: Work-in-progress on `feature/collaboration` branch  
**Last Updated**: 2025-11-16  
**Branch**: `feature/collaboration`

---

## Overview

This document outlines three major collaboration features being developed for the Document Intelligence Suite:

1. **GitHub Archive Comment Threads** — Team-based discussions on archived repositories
2. **Saved Views** — Persistent, shareable filter views of archive data
3. **thepipe Service** — AI-enabled document extraction microservice

All features are backed by:
- Comprehensive SQL migrations with team-based access control
- Row-Level Security (RLS) policies enforcing permissions at the database level
- Edge Function scaffolding ready for implementation
- Full CRUD endpoints with proper authorization

---

## Feature Details

### 1. GitHub Archive Comment Threads

**Purpose**: Enable teams to discuss archived repositories directly in the UI.

**Scope**:
- **Backend**:
  - `comment_threads` table: one thread per repository + team/owner context
  - `comments` table: threaded conversations with mentions support
  - RLS policies: visible only to thread owner, commenters, or team members
  - Edge Functions: `comment-thread` (GET/POST) and `comments` (CRUD)

- **Frontend**:
  - "Comments" button on GitHubAnalyzer cards
  - Side panel with comment list and composer
  - Edit/delete for own comments
  - Mention autocomplete (future enhancement)

**Database Schema**:
- Migration: `supabase/migrations/20251108003000_add_comment_threads.sql`
- Tables: `public.comment_threads`, `public.comments`
- Indexes: repo lookup, author lookup, thread queries
- Triggers: auto-update `updated_at` on comment edits

**Edge Functions**:
- `supabase/functions/comment-thread/index.ts` — GET/POST endpoints
- `supabase/functions/comments/index.ts` — Full CRUD (GET/POST/PUT/DELETE)

**Implementation Plan**:
1. ✅ Migrations written and committed
2. ⏳ Edge Functions implementation (Task #3-4)
3. ⏳ Frontend UI component (Task #6)
4. ⏳ Integration tests (Task #9)

---

### 2. Saved Views

**Purpose**: Allow users to create, save, and share filtered views of archive data.

**Scope**:
- **Backend**:
  - `saved_views` table: filter snapshots with visibility settings (private/team/public)
  - RLS policies: ownership + team visibility rules
  - Edge Function: `saved-views` (CRUD with visibility controls)

- **Frontend**:
  - "Save View" button to persist current filters
  - "Load View" dropdown to switch between saved views
  - Sharing controls (private/team/public)

**Database Schema**:
- Migration: `supabase/migrations/20251108001000_create_saved_views.sql`
- Table: `public.saved_views`
- Indexes: owner, team, visibility for efficient filtering
- Trigger: auto-update `updated_at` on edits

**Edge Function**:
- `supabase/functions/saved-views/index.ts` — CRUD with proper RLS

**Implementation Plan**:
1. ✅ Migrations written and committed
2. ⏳ Edge Function implementation (Task #5)
3. ⏳ Frontend UI for save/load (Task #6)
4. ⏳ Integration tests (Task #9)

---

### 3. thepipe Service

**Purpose**: Wrap thepipe CLI in an HTTP microservice for AI-enabled document extraction.

**Scope**:
- **Backend**:
  - FastAPI microservice wrapping thepipe CLI
  - `/health` endpoint for monitoring
  - `/extract` endpoint (POST) for document processing
  - Support for file uploads and URL sources

- **Deployment Options**:
  - Railway (recommended for prototype)
  - Vercel Functions (lightweight, serverless)
  - Supabase Edge Functions with background workers (experimental)

**Service Files**:
- Dockerfile for containerization
- `app/main.py`: FastAPI application
- `requirements.txt`: thepipe + dependencies
- `scripts/evaluate.py`: performance benchmarking
- Documentation: setup, configuration, usage examples

**Implementation Plan**:
1. ✅ Service scaffolding committed to feature/collaboration
2. ⏳ Local testing & performance evaluation (Task #7)
3. ⏳ Deploy to staging (Task #8)
4. ⏳ Integration with document pipeline (future)

**Open Questions**:
- Storage strategy for extracted media (base64 vs. object storage)?
- Concurrency model (sync vs. async workers)?
- Cost vs. performance trade-offs for different providers?

---

## Team & Collaboration Infrastructure

**Supporting Migrations**:
- `supabase/migrations/20251108000000_add_collaboration_tables.sql`
  - `public.profiles`: user metadata (display_name, avatar_url)
  - `public.teams`: team definition and ownership
  - `public.team_members`: team membership with roles (owner/editor/viewer)
  - `public.github_analyses`: ownership metadata (owner_id, team_id)

**Authorization Model**:
- **Owner**: User who created a resource; can delete and modify
- **Team Editor**: Team member with write permissions
- **Team Viewer**: Team member with read-only access
- **Public**: Only for saved views; anyone can view

**RLS Enforcement**:
- All tables have row-level security enabled
- Policies check `auth.uid()` and team membership
- Cascading deletes ensure referential integrity

---

## Development Plan

### Phase 1: Implementation (Current)
**Timeline**: ~1-2 weeks  
**Owner**: Development team

**Tasks**:
1. ✅ **Task #1**: Organize untracked files into feature branch ← **DONE**
2. ⏳ **Task #2**: Validate and test migrations locally
3. ⏳ **Task #3**: Implement comment-thread Edge Function
4. ⏳ **Task #4**: Implement comments CRUD Edge Function
5. ⏳ **Task #5**: Implement saved-views Edge Function
6. ⏳ **Task #6**: Add frontend UI components
7. ⏳ **Task #7**: Evaluate thepipe-service performance

**Exit Criteria**:
- All Edge Functions pass curl/Postman tests
- Frontend UI renders without errors
- thepipe service runs locally successfully
- No RLS policy violations detected

### Phase 2: Testing & QA
**Timeline**: ~3-5 days  
**Owner**: QA / Dev

**Tasks**:
8. ⏳ **Task #8**: Deploy to staging environment
9. ⏳ **Task #9**: Write and run integration tests
10. ⏳ **Task #10**: Code review and PR merge

**Exit Criteria**:
- 100% of tests passing
- No security vulnerabilities
- CI workflow passes all checks
- Performance benchmarks acceptable

### Phase 3: Production Deployment
**Timeline**: ~1 day  
**Owner**: DevOps / Lead Dev

**Tasks**:
11. ⏳ **Task #11**: Set up health monitoring
12. ⏳ **Task #12**: Document deployment runbook

**Exit Criteria**:
- Feature branch merged to main
- Vercel deployment successful
- Supabase migrations applied
- Health checks passing
- Monitoring alerts configured

---

## Current Status

**Branch**: `feature/collaboration`  
**Latest Commit**: `860b530` — feat: add collaboration features scaffolding

**What's Done**:
- ✅ Feature branch created
- ✅ All untracked files organized and committed
- ✅ SQL migrations written with RLS policies
- ✅ Edge Function scaffolding created
- ✅ thepipe service files included

**What's Next**:
- ⏳ Test migrations for syntax errors (Task #2)
- ⏳ Build Edge Function implementations (Tasks #3-5)
- ⏳ Create frontend UI components (Task #6)
- ⏳ Deploy to staging for QA (Task #8)

---

## Testing Strategy

### Unit Tests
- Edge Function business logic (authorization, data validation)
- Frontend components (CommentPanel, SaveViewButton, etc.)
- RLS policy behavior via Supabase test client

### Integration Tests
- Comment CRUD with team member permissions
- Saved view visibility across owners/teams
- Cross-team access denial checks

### Smoke Tests (Pre-Production)
- `/health` endpoint responds
- Comment thread creation with authenticated user
- Saved view creation and retrieval
- Team member access control

---

## Risk Mitigation

**Risk**: RLS policy bugs allow unauthorized access  
**Mitigation**: Test all policies with Supabase test client; audit SQL migrations

**Risk**: N+1 queries on comment threads (performance)  
**Mitigation**: Add indexes on foreign keys; use Supabase query analysis

**Risk**: thepipe service deployment costs exceed budget  
**Mitigation**: Evaluate with small sample dataset; choose cost-effective provider

**Risk**: Race conditions in comment creation  
**Mitigation**: Use database constraints and pessimistic locking if needed

---

## Deployment Checklist

- [ ] All tests pass locally (`npm test`, migrations validated)
- [ ] CI workflow passes on feature branch
- [ ] Code review approved (peer / lead dev)
- [ ] No RLS policy violations
- [ ] Performance benchmarks acceptable
- [ ] Edge Function curl tests successful
- [ ] Frontend UI renders correctly
- [ ] Staging environment deployed and tested
- [ ] Health monitoring configured
- [ ] Deployment runbook documented
- [ ] Rollback plan in place

---

## Communication

**Branch Owner**: Patrick Jaritz  
**Slack Channel**: (if applicable)  
**Status Updates**: Weekly via git commits and this roadmap

For questions or feedback, check the task list or reach out to the development team.

---

## References

- **Collaboration Plan**: `docs/GITHUB_ARCHIVE_COMMENTS_PLAN.md`
- **thepipe Plan**: `docs/THEPIPE_SERVICE_PLAN.md`
- **Migrations**: `supabase/migrations/20251108*.sql`
- **Edge Functions**: `supabase/functions/{comment-thread,comments,saved-views}/`
- **Service**: `services/thepipe-service/`
