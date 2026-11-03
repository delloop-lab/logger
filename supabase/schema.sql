-- TimberVault Stage 4 schema (run in Supabase SQL Editor)
-- Project: ixxutrrpwdiqyjzieped

-- Profiles (optional display name)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- Per-user preferences (units, etc.)
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  updated_at timestamptz not null default now()
);

-- Workshop storage locations for this user
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

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.storage_locations enable row level security;

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

-- Auto-create profile + prefs on signup
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
