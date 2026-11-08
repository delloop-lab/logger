-- TimberVault cloud schema (run all of this in Supabase SQL Editor)
-- Project: ixxutrrpwdiqyjzieped
-- Safe to re-run.

-- Profiles (optional display name)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- Per-user preferences + working cut-list state
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  offcut_min_length numeric not null default 100,
  offcut_min_width numeric not null default 100,
  active_project_name text not null default 'New Project',
  active_parts jsonb not null default '[]'::jsonb,
  completed_operations jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Add columns if an older user_preferences table already exists
alter table public.user_preferences
  add column if not exists offcut_min_length numeric not null default 100;
alter table public.user_preferences
  add column if not exists offcut_min_width numeric not null default 100;
alter table public.user_preferences
  add column if not exists active_project_name text not null default 'New Project';
alter table public.user_preferences
  add column if not exists active_parts jsonb not null default '[]'::jsonb;
alter table public.user_preferences
  add column if not exists completed_operations jsonb not null default '[]'::jsonb;
alter table public.user_preferences
  add column if not exists default_kerf_mm numeric not null default 3.2;
alter table public.user_preferences
  add column if not exists active_kerf_mm numeric not null default 3.2;
alter table public.user_preferences
  add column if not exists lumber_types jsonb not null default '[]'::jsonb;

-- Workshop storage locations
create table if not exists public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists storage_locations_user_idx
  on public.storage_locations (user_id, sort_order);

-- Inventory boards / lots (cloud source of truth)
create table if not exists public.boards (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  tag_id text not null,
  species text not null,
  source text not null default '',
  length_mm numeric not null,
  width_mm numeric not null,
  thickness_mm numeric not null,
  quantity int not null default 1,
  location text not null default 'Workbench',
  status text not null default 'active',
  classification text,
  parent_board_id text,
  origin_project text,
  notes text,
  defects jsonb not null default '[]'::jsonb,
  defect_notes text,
  units_issued int not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.boards
  add column if not exists defects jsonb not null default '[]'::jsonb;
alter table public.boards
  add column if not exists defect_notes text;
alter table public.boards
  add column if not exists units_issued int not null default 0;

create index if not exists boards_user_idx on public.boards (user_id, created_at desc);
create index if not exists boards_user_tag_idx on public.boards (user_id, tag_id);

-- Saved projects
create table if not exists public.saved_projects (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  project_date text not null default '',
  parts jsonb not null default '[]'::jsonb,
  kerf_mm numeric,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.saved_projects
  add column if not exists kerf_mm numeric;
alter table public.saved_projects
  add column if not exists status text not null default 'active';
alter table public.saved_projects
  add column if not exists pause_reason text;
alter table public.saved_projects
  add column if not exists cutting_plan jsonb;
alter table public.saved_projects
  add column if not exists completed_cut_ops jsonb not null default '[]'::jsonb;
alter table public.saved_projects
  add column if not exists description text;
alter table public.saved_projects
  add column if not exists difficulty text;

create index if not exists saved_projects_user_idx
  on public.saved_projects (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.storage_locations enable row level security;
alter table public.boards enable row level security;
alter table public.saved_projects enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Preferences policies
drop policy if exists "prefs_select_own" on public.user_preferences;
create policy "prefs_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "prefs_insert_own" on public.user_preferences;
create policy "prefs_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "prefs_update_own" on public.user_preferences;
create policy "prefs_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id);

-- Storage location policies
drop policy if exists "locations_select_own" on public.storage_locations;
create policy "locations_select_own"
  on public.storage_locations for select
  using (auth.uid() = user_id);

drop policy if exists "locations_insert_own" on public.storage_locations;
create policy "locations_insert_own"
  on public.storage_locations for insert
  with check (auth.uid() = user_id);

drop policy if exists "locations_update_own" on public.storage_locations;
create policy "locations_update_own"
  on public.storage_locations for update
  using (auth.uid() = user_id);

drop policy if exists "locations_delete_own" on public.storage_locations;
create policy "locations_delete_own"
  on public.storage_locations for delete
  using (auth.uid() = user_id);

-- Boards policies
drop policy if exists "boards_select_own" on public.boards;
create policy "boards_select_own"
  on public.boards for select
  using (auth.uid() = user_id);

drop policy if exists "boards_insert_own" on public.boards;
create policy "boards_insert_own"
  on public.boards for insert
  with check (auth.uid() = user_id);

drop policy if exists "boards_update_own" on public.boards;
create policy "boards_update_own"
  on public.boards for update
  using (auth.uid() = user_id);

drop policy if exists "boards_delete_own" on public.boards;
create policy "boards_delete_own"
  on public.boards for delete
  using (auth.uid() = user_id);

-- Saved projects policies (personal to each user; see also migrate-project-privacy.sql)
drop policy if exists "projects_select_own" on public.saved_projects;
create policy "projects_select_own"
  on public.saved_projects for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.saved_projects;
create policy "projects_insert_own"
  on public.saved_projects for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.saved_projects;
create policy "projects_update_own"
  on public.saved_projects for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "projects_delete_own" on public.saved_projects;
create policy "projects_delete_own"
  on public.saved_projects for delete
  to authenticated
  using (auth.uid() = user_id);

-- Auto-create profile + prefs + default locations on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id, unit_system)
  values (new.id, 'metric')
  on conflict (user_id) do nothing;

  insert into public.storage_locations (user_id, name, sort_order)
  values
    (new.id, 'Workbench', 0),
    (new.id, 'Rack 1', 1),
    (new.id, 'Rack 2', 2),
    (new.id, 'Rack 3', 3),
    (new.id, 'Small Rack', 4),
    (new.id, 'Under Cabinet', 5),
    (new.id, 'Offcut Bin', 6)
  on conflict (user_id, name) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Admin analytics (profiles email/last_seen, page_hits, admin RLS):
-- run supabase/migrate-admin-analytics.sql in the Supabase SQL editor.
