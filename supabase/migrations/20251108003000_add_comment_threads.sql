-- Comment threads for GitHub archive discussions

create extension if not exists "uuid-ossp";

create table if not exists public.comment_threads (
  id uuid primary key default gen_random_uuid(),
  repository_url text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (repository_url, coalesce(team_id, owner_id))
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.comment_threads(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  mentions uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz,
  resolved_at timestamptz
);

create index if not exists idx_comment_threads_repo on public.comment_threads(repository_url);
create index if not exists idx_comment_threads_team on public.comment_threads(team_id);
create index if not exists idx_comments_thread on public.comments(thread_id);
create index if not exists idx_comments_author on public.comments(author_id);

create or replace function public.set_comment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at
before update on public.comments
for each row
when (old.body is distinct from new.body or old.resolved_at is distinct from new.resolved_at)
execute procedure public.set_comment_updated_at();

alter table public.comment_threads enable row level security;
alter table public.comments enable row level security;

-- Policies for comment_threads
drop policy if exists "comment_threads_select" on public.comment_threads;
drop policy if exists "comment_threads_insert" on public.comment_threads;
drop policy if exists "comment_threads_update" on public.comment_threads;
drop policy if exists "comment_threads_delete" on public.comment_threads;

create policy "comment_threads_select"
  on public.comment_threads
  for select
  using (
    owner_id = auth.uid()
    or (
      team_id is not null and exists (
        select 1
        from public.team_members tm
        where tm.team_id = comment_threads.team_id
          and tm.user_id = auth.uid()
      )
    )
    or exists (
      select 1
      from public.comments c
      where c.thread_id = comment_threads.id
        and c.author_id = auth.uid()
    )
  );

create policy "comment_threads_insert"
  on public.comment_threads
  for insert
  with check (
    owner_id = auth.uid()
    or (
      team_id is not null and exists (
        select 1
        from public.team_members tm
        where tm.team_id = comment_threads.team_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'editor')
      )
    )
  );

create policy "comment_threads_update"
  on public.comment_threads
  for update
  using (
    owner_id = auth.uid()
    or (
      team_id is not null and exists (
        select 1
        from public.team_members tm
        where tm.team_id = comment_threads.team_id
          and tm.user_id = auth.uid()
          and tm.role = 'owner'
      )
    )
  )
  with check (
    owner_id = auth.uid()
    or (
      team_id is not null and exists (
        select 1
        from public.team_members tm
        where tm.team_id = comment_threads.team_id
          and tm.user_id = auth.uid()
          and tm.role = 'owner'
      )
    )
  );

create policy "comment_threads_delete"
  on public.comment_threads
  for delete
  using (
    owner_id = auth.uid()
    or (
      team_id is not null and exists (
        select 1
        from public.team_members tm
        where tm.team_id = comment_threads.team_id
          and tm.user_id = auth.uid()
          and tm.role = 'owner'
      )
    )
  );

-- Policies for comments
drop policy if exists "comments_select" on public.comments;
drop policy if exists "comments_insert" on public.comments;
drop policy if exists "comments_update" on public.comments;
drop policy if exists "comments_delete" on public.comments;

create policy "comments_select"
  on public.comments
  for select
  using (
    exists (
      select 1
      from public.comment_threads ct
      where ct.id = comments.thread_id
        and (
          ct.owner_id = auth.uid()
          or (
            ct.team_id is not null and exists (
              select 1
              from public.team_members tm
              where tm.team_id = ct.team_id
                and tm.user_id = auth.uid()
            )
          )
          or comments.author_id = auth.uid()
        )
    )
  );

create policy "comments_insert"
  on public.comments
  for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.comment_threads ct
      where ct.id = comments.thread_id
        and (
          ct.owner_id = auth.uid()
          or (
            ct.team_id is not null and exists (
              select 1
              from public.team_members tm
              where tm.team_id = ct.team_id
                and tm.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy "comments_update"
  on public.comments
  for update
  using (
    author_id = auth.uid()
    or exists (
      select 1
      from public.comment_threads ct
      where ct.id = comments.thread_id
        and ct.team_id is not null
        and exists (
          select 1
          from public.team_members tm
          where tm.team_id = ct.team_id
            and tm.user_id = auth.uid()
            and tm.role = 'owner'
        )
    )
  )
  with check (
    author_id = auth.uid()
    or exists (
      select 1
      from public.comment_threads ct
      where ct.id = comments.thread_id
        and ct.team_id is not null
        and exists (
          select 1
          from public.team_members tm
          where tm.team_id = ct.team_id
            and tm.user_id = auth.uid()
            and tm.role = 'owner'
        )
    )
  );

create policy "comments_delete"
  on public.comments
  for update using (
    author_id = auth.uid()
    or exists (
      select 1
      from public.comment_threads ct
      where ct.id = comments.thread_id
        and ct.team_id is not null
        and exists (
          select 1
          from public.team_members tm
          where tm.team_id = ct.team_id
            and tm.user_id = auth.uid()
            and tm.role = 'owner'
        )
    )
  )
  with check (
    author_id = auth.uid()
    or exists (
      select 1
      from public.comment_threads ct
      where ct.id = comments.thread_id
        and ct.team_id is not null
        and exists (
          select 1
          from public.team_members tm
          where tm.team_id = ct.team_id
            and tm.user_id = auth.uid()
            and tm.role = 'owner'
        )
    )
  );


