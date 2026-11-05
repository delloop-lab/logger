-- Daily point-in-time cloud backups per user (complements on-device IndexedDB backups).
-- Run in the Supabase SQL Editor.

create table if not exists public.workspace_backups (
  user_id uuid not null references auth.users (id) on delete cascade,
  backup_date text not null,
  board_count int not null default 0,
  project_count int not null default 0,
  snapshot jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, backup_date)
);

create index if not exists workspace_backups_user_date_idx
  on public.workspace_backups (user_id, backup_date desc);

alter table public.workspace_backups enable row level security;

drop policy if exists "workspace_backups_select_own" on public.workspace_backups;
create policy "workspace_backups_select_own"
  on public.workspace_backups for select
  using (auth.uid() = user_id);

drop policy if exists "workspace_backups_insert_own" on public.workspace_backups;
create policy "workspace_backups_insert_own"
  on public.workspace_backups for insert
  with check (auth.uid() = user_id);

drop policy if exists "workspace_backups_update_own" on public.workspace_backups;
create policy "workspace_backups_update_own"
  on public.workspace_backups for update
  using (auth.uid() = user_id);
