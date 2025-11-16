-- Add collaboration scaffolding: profiles, teams, memberships, and ownership metadata

-- Ensure extensions required for UUID generation exist
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Profiles table mirrors auth.users with metadata
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute procedure public.set_profiles_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Teams and memberships
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_id, user_id),
  constraint team_members_role_check check (role in ('owner', 'editor', 'viewer'))
);

create index if not exists idx_team_members_user on public.team_members(user_id);
create index if not exists idx_team_members_team on public.team_members(team_id);

-- Ownership metadata on github_analyses
alter table public.github_analyses
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists idx_github_analyses_owner on public.github_analyses(owner_id);
create index if not exists idx_github_analyses_team on public.github_analyses(team_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.github_analyses enable row level security;

-- Profiles policies
drop policy if exists "Profiles are viewable by owners" on public.profiles;
drop policy if exists "Profiles are editable by owners" on public.profiles;

create policy "Profiles are viewable by owners"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Profiles are editable by owners"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Teams policies
drop policy if exists "Users view teams they belong to" on public.teams;
drop policy if exists "Users manage teams they own" on public.teams;

create policy "Users view teams they belong to"
  on public.teams
  for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = teams.id and tm.user_id = auth.uid()
    )
  );

create policy "Users manage teams they own"
  on public.teams
  for all
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = teams.id and tm.user_id = auth.uid() and tm.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = teams.id and tm.user_id = auth.uid() and tm.role = 'owner'
    )
  );

-- Team members policies
drop policy if exists "Team memberships are viewable by members" on public.team_members;
drop policy if exists "Team memberships editable by owners" on public.team_members;

create policy "Team memberships are viewable by members"
  on public.team_members
  for select
  using (
    team_members.user_id = auth.uid()
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id and tm.user_id = auth.uid()
    )
  );

create policy "Team memberships editable by owners"
  on public.team_members
  for all
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id and tm.user_id = auth.uid() and tm.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id and tm.user_id = auth.uid() and tm.role = 'owner'
    )
  );

-- github_analyses policies
drop policy if exists "Public can view github analyses" on public.github_analyses;
drop policy if exists "Public can insert github analyses" on public.github_analyses;
drop policy if exists "Public can update github analyses" on public.github_analyses;
drop policy if exists "Public can delete github analyses" on public.github_analyses;

create policy "Owners or team members can view"
  on public.github_analyses
  for select
  using (
    owner_id = auth.uid()
    or owner_id is null
    or (
      team_id is not null and exists (
        select 1 from public.team_members tm
        where tm.team_id = github_analyses.team_id and tm.user_id = auth.uid()
      )
    )
  );

create policy "Owners or editors can modify"
  on public.github_analyses
  for update
  using (
    owner_id = auth.uid()
    or (
      team_id is not null and exists (
        select 1 from public.team_members tm
        where tm.team_id = github_analyses.team_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'editor')
      )
    )
  )
  with check (
    owner_id = auth.uid()
    or (
      team_id is not null and exists (
        select 1 from public.team_members tm
        where tm.team_id = github_analyses.team_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'editor')
      )
    )
  );

create policy "Owners or team editors can delete"
  on public.github_analyses
  for delete
  using (
    owner_id = auth.uid()
    or (
      team_id is not null and exists (
        select 1 from public.team_members tm
        where tm.team_id = github_analyses.team_id
          and tm.user_id = auth.uid()
          and tm.role = 'owner'
      )
    )
  );

create policy "Authenticated users can insert with ownership"
  on public.github_analyses
  for insert
  with check (
    owner_id = auth.uid()
    or owner_id is null
  );


