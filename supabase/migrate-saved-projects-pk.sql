-- Ensure saved_projects can upsert on (user_id, id).
-- Older DBs may have had `id` as the sole primary key, which breaks
-- `ON CONFLICT (user_id, id)` and caused wipe/duplicate-key failures.

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'saved_projects'
      and constraint_type = 'PRIMARY KEY'
      and constraint_name = 'saved_projects_pkey'
  ) then
    alter table public.saved_projects drop constraint saved_projects_pkey;
  end if;
exception
  when undefined_object then null;
end $$;

alter table public.saved_projects
  add primary key (user_id, id);
