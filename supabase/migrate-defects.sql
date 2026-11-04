-- Safe migration only: add defect + lot unit columns to boards.
-- Does not drop policies, triggers, or data.
-- Run this in Supabase SQL Editor if you already have TimberVault tables.

alter table public.boards
  add column if not exists defects jsonb not null default '[]'::jsonb;

alter table public.boards
  add column if not exists defect_notes text;

alter table public.boards
  add column if not exists units_issued int not null default 0;
