-- Safe migration: pause status for projects waiting on stock.
alter table public.saved_projects
  add column if not exists status text not null default 'active';
alter table public.saved_projects
  add column if not exists pause_reason text;
