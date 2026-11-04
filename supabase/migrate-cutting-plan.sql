-- Safe migration: store confirmed cutting plan + progress on each project.
alter table public.saved_projects
  add column if not exists cutting_plan jsonb;
alter table public.saved_projects
  add column if not exists completed_cut_ops jsonb not null default '[]'::jsonb;
