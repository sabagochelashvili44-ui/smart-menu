-- Staff-first restaurant lookup for a login email (then manager_email).

create or replace function public.restaurants_for_login_email(p_email text)
returns setof public.restaurants
language sql
stable
security definer
set search_path = public
as $$
  select r.*
  from public.restaurants r
  where lower(trim(coalesce(p_email, ''))) <> ''
    and (
      exists (
        select 1
        from public.restaurant_staff s
        where s.restaurant_id = r.id
          and lower(trim(s.email)) = lower(trim(p_email))
      )
      or lower(trim(coalesce(r.manager_email, ''))) = lower(trim(p_email))
    )
  order by
    case
      when exists (
        select 1
        from public.restaurant_staff s
        where s.restaurant_id = r.id
          and lower(trim(s.email)) = lower(trim(p_email))
      ) then 0
      else 1
    end,
    r.created_at asc;
$$;

grant execute on function public.restaurants_for_login_email(text)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
