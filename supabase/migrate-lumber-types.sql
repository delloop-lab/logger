-- Editable lumber / species catalog on user preferences (safe to re-run).
alter table public.user_preferences
  add column if not exists lumber_types jsonb not null default '[]'::jsonb;
