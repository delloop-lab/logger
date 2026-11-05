-- Delete the orphan profile that Admin shows as "870c2d82" (truncated user id, no email).
-- Run in Supabase → SQL Editor. Cascades boards, projects, prefs, locations, page_hits, profile.

do $$
declare
  target uuid;
begin
  select u.id
  into target
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id::text like '870c2d82%'
    and (u.email is null or btrim(u.email) = '')
  order by u.created_at
  limit 1;

  if target is null then
    select p.id
    into target
    from public.profiles p
    where p.id::text like '870c2d82%'
      and (p.email is null or btrim(p.email) = '')
    limit 1;
  end if;

  if target is null then
    raise notice 'No matching orphan user found for prefix 870c2d82';
    return;
  end if;

  raise notice 'Deleting user %', target;

  -- Prefer auth.users delete (cascades FKs). If profile-only, clean public tables.
  delete from auth.users where id = target;

  delete from public.page_hits where user_id = target;
  delete from public.boards where user_id = target;
  delete from public.saved_projects where user_id = target;
  delete from public.storage_locations where user_id = target;
  delete from public.user_preferences where user_id = target;
  delete from public.profiles where id = target;
end $$;
