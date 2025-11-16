-- Create saved views table for archive filters with sharing controls

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  visibility text not null default 'private',
  description text,
  filter_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_views_visibility_check check (visibility in ('private', 'team', 'public'))
);

create or replace function public.saved_views_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_saved_views_updated_at on public.saved_views;
create trigger trg_saved_views_updated_at
before update on public.saved_views
for each row
execute procedure public.saved_views_set_updated_at();

create index if not exists idx_saved_views_owner on public.saved_views(owner_id);
create index if not exists idx_saved_views_team on public.saved_views(team_id);
create index if not exists idx_saved_views_visibility on public.saved_views(visibility);

alter table public.saved_views enable row level security;

drop policy if exists "saved_views_select" on public.saved_views;
drop policy if exists "saved_views_insert" on public.saved_views;
drop policy if exists "saved_views_update" on public.saved_views;
drop policy if exists "saved_views_delete" on public.saved_views;

create policy "saved_views_select"
  on public.saved_views
  for select
  using (
    owner_id = auth.uid()
    or visibility = 'public'
    or (
      visibility = 'team'
      and team_id is not null
      and exists (
        select 1 from public.team_members tm
        where tm.team_id = saved_views.team_id
          and tm.user_id = auth.uid()
      )
    )
  );

create policy "saved_views_insert"
  on public.saved_views
  for insert
  with check (
    owner_id = auth.uid()
    and (
      team_id is null
      or exists (
        select 1 from public.team_members tm
        where tm.team_id = saved_views.team_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'editor')
      )
    )
  );

create policy "saved_views_update"
  on public.saved_views
  for update
  using (
    owner_id = auth.uid()
    or (
      team_id is not null
      and exists (
        select 1 from public.team_members tm
        where tm.team_id = saved_views.team_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'editor')
      )
    )
  )
  with check (
    owner_id = auth.uid()
    or (
      team_id is not null
      and exists (
        select 1 from public.team_members tm
        where tm.team_id = saved_views.team_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'editor')
      )
    )
  );

create policy "saved_views_delete"
  on public.saved_views
  for delete
  using (
    owner_id = auth.uid()
    or (
      team_id is not null
      and exists (
        select 1 from public.team_members tm
        where tm.team_id = saved_views.team_id
          and tm.user_id = auth.uid()
          and tm.role = 'owner'
      )
    )
  );


