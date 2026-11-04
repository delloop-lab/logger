-- Completed builds in What Can I Build: description + difficulty showcase fields.
-- Safe to re-run (ADD COLUMN IF NOT EXISTS). status already supports text values including 'completed'.

alter table public.saved_projects
  add column if not exists description text;

alter table public.saved_projects
  add column if not exists difficulty text;
