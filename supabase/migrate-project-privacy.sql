-- Project privacy: saved_projects stay personal to each user (safe to re-run).
-- Non-admins: own rows only. Admins: read-only for Admin analytics (no cross-user write).
-- No community / public project visibility.

alter table public.saved_projects enable row level security;

-- Drop any legacy / overly broad policies if present
drop policy if exists "projects_select_own" on public.saved_projects;
drop policy if exists "projects_insert_own" on public.saved_projects;
drop policy if exists "projects_update_own" on public.saved_projects;
drop policy if exists "projects_delete_own" on public.saved_projects;
drop policy if exists "projects_select_admin" on public.saved_projects;
drop policy if exists "projects_all" on public.saved_projects;
drop policy if exists "Enable read access for all users" on public.saved_projects;
drop policy if exists "Enable insert for authenticated users only" on public.saved_projects;

-- Owner read
create policy "projects_select_own"
  on public.saved_projects for select
  to authenticated
  using (auth.uid() = user_id);

-- Admin read (analytics / user counts only; never grants write on others' projects)
create policy "projects_select_admin"
  on public.saved_projects for select
  to authenticated
  using (public.is_app_admin());

-- Owner create: may only insert as themselves
create policy "projects_insert_own"
  on public.saved_projects for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Owner update: cannot reassign user_id to someone else
create policy "projects_update_own"
  on public.saved_projects for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Owner delete
create policy "projects_delete_own"
  on public.saved_projects for delete
  to authenticated
  using (auth.uid() = user_id);

-- Ensure anon has no table privileges beyond what RLS would anyway deny
revoke all on table public.saved_projects from anon;
grant select, insert, update, delete on table public.saved_projects to authenticated;
