# GitHub Archive Comment Threads – Implementation Plan

## Goals

- Allow users to discuss each archived repository directly in the UI.
- Persist threaded conversations with author identity, timestamps, and optional mentions.
- Enforce existing ownership/team policies (only owners/team members can post).
- Provide a slide-out “Discussion” panel on archive cards with create/read/update/delete (CRUD) operations.

## Backend Scope

### Schema

1. `comment_threads`
   - `id uuid primary key default gen_random_uuid()`
   - `repository_url text not null`
   - `owner_id uuid references auth.users(id) on delete cascade`
   - `team_id uuid references public.teams(id) on delete set null`
   - `created_at timestamptz default now()`
   - Unique constraint on (`repository_url`, `team_id`, `owner_id`) to prevent duplicates per context.
2. `comments`
   - `id uuid primary key default gen_random_uuid()`
   - `thread_id uuid references comment_threads(id) on delete cascade`
   - `author_id uuid references auth.users(id) on delete cascade`
   - `body text not null`
   - `mentions uuid[] default '{}'::uuid[]`
   - `created_at timestamptz default now()`
   - `updated_at timestamptz`
   - `deleted_at timestamptz`
   - `resolved_at timestamptz`

### Row Level Security

- Threads: visible when user is owner, commenter, or member of the team.
- Comments: same visibility as parent thread; insert/update/delete restricted to author (or team owner for moderation).

### Edge Functions

1. `comment-thread`
   - GET `/comment-thread?repo=...` → returns thread metadata + counts; creates a thread implicitly if missing.
   - POST → explicit thread creation (used if team/owner context not yet known).
2. `comments`
   - GET `/comments?thread_id=...` → paginated comments list.
   - POST → create comment (`body`, `mentions`).
   - PUT `/comments/:id` → edit comment (author or moderator).
   - DELETE `/comments/:id` → soft delete.
   - Optional `resolve` endpoint.

### Events / Notifications (later)

- Hook into Supabase realtime or queue to notify mentioned users.

## Frontend Scope

- Extend `GitHubAnalyzer.tsx`:
  - “Comments” button on each card – opens side panel.
  - Comment panel shows thread information, comment list, composer.
  - Inline editing & delete for own comments.
  - Mention autocomplete (future: requires `/profiles` lookup).
- New hook `useCommentThread(repositoryUrl)` to manage fetch, create, and optimistic updates.
- Loading/error states; count indicator on card.

## Deliverables (initial milestone)

1. New SQL migration for tables, indexes, RLS policies.
2. Edge functions deployed (`comment-thread`, `comments`).
3. Frontend UI (read/create/delete).
4. Basic tests/manual QA script: create comment, edit, delete, cross-team access check.

## Open Questions

- Do we need comment visibility for “public” archives? (Current assumption: comments are scoped to owners/team members only.)
- Should resolved comments remain visible or be collapsible?
- Do we support file attachments/bot messages? (Out of scope for first pass.)


