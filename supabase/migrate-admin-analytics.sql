-- Admin analytics: profiles enrichment + page hits (safe to re-run).
-- Admin access: JWT email lou@schillaci.me, or profiles.is_admin = true.

alter table public.profiles
  add column if not exists email text;
alter table public.profiles
  add column if not exists last_seen_at timestamptz;
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create index if not exists profiles_email_idx on public.profiles (email);

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'lou@schillaci.me'
    ),
    false
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin is true
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

create table if not exists public.page_hits (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  tab text,
  user_id uuid references auth.users (id) on delete set null,
  session_id text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists page_hits_created_idx on public.page_hits (created_at desc);
create index if not exists page_hits_tab_idx on public.page_hits (tab, created_at desc);
create index if not exists page_hits_user_idx on public.page_hits (user_id, created_at desc);

alter table public.page_hits enable row level security;

drop policy if exists "page_hits_insert_own" on public.page_hits;
create policy "page_hits_insert_own"
  on public.page_hits for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "page_hits_select_admin" on public.page_hits;
create policy "page_hits_select_admin"
  on public.page_hits for select
  to authenticated
  using (public.is_app_admin());

-- Profiles: users can upsert/read themselves; admins read everyone
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_app_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_app_admin())
  with check (id = auth.uid() or public.is_app_admin());

-- Admins can read workshop tables for aggregate stats
drop policy if exists "boards_select_admin" on public.boards;
create policy "boards_select_admin"
  on public.boards for select
  to authenticated
  using (user_id = auth.uid() or public.is_app_admin());

drop policy if exists "projects_select_admin" on public.saved_projects;
create policy "projects_select_admin"
  on public.saved_projects for select
  to authenticated
  using (user_id = auth.uid() or public.is_app_admin());

-- Promote known admin by email when profile exists
update public.profiles
set is_admin = true
where lower(coalesce(email, '')) = 'lou@schillaci.me';

-- Admin-only: delete a user (auth + cascaded workshop data)
create or replace function public.admin_delete_user(target uuid)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  if target is null then
    raise exception 'Missing user id';
  end if;

  if target = auth.uid() then
    raise exception 'Cannot delete your own admin account';
  end if;

  delete from public.page_hits where user_id = target;
  delete from public.boards where user_id = target;
  delete from public.saved_projects where user_id = target;
  delete from public.storage_locations where user_id = target;
  delete from public.user_preferences where user_id = target;
  delete from public.profiles where id = target;
  delete from auth.users where id = target;

  return json_build_object('ok', true, 'deleted', target);
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
