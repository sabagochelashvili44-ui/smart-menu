-- Manager-email tenant lookup + authenticated SELECT of own restaurant.

create index if not exists restaurants_manager_email_lower_idx
  on public.restaurants (lower(trim(manager_email)));

create or replace function public.restaurants_for_manager_email(p_email text)
returns setof public.restaurants
language sql
stable
security invoker
set search_path = public
as $$
  select r.*
  from public.restaurants r
  where lower(trim(coalesce(r.manager_email, ''))) = lower(trim(coalesce(p_email, '')))
    and lower(trim(coalesce(p_email, ''))) <> ''
  order by r.created_at asc;
$$;

grant execute on function public.restaurants_for_manager_email(text)
  to anon, authenticated, service_role;

drop policy if exists restaurants_select_authenticated on public.restaurants;
drop policy if exists restaurants_select_own_manager on public.restaurants;

create policy restaurants_select_own_manager
  on public.restaurants
  for select
  to authenticated
  using (
    lower(trim(coalesce(manager_email, '')))
      = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    or public.is_super_admin()
  );
