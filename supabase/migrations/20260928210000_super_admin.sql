-- Super-admin SaaS fields + RLS
-- See supabase/super-admin-setup.sql for SQL Editor usage.

alter table public.restaurants
  add column if not exists subscription_status text,
  add column if not exists subscription_fee numeric(10, 2),
  add column if not exists valid_until timestamptz,
  add column if not exists manager_email text;

update public.restaurants
set
  subscription_status = coalesce(nullif(subscription_status, ''), 'active'),
  subscription_fee = coalesce(subscription_fee, 0),
  valid_until = coalesce(valid_until, now() + interval '1 year')
where true;

alter table public.restaurants
  alter column subscription_status set default 'trial',
  alter column subscription_fee set default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'restaurants_subscription_status_check'
  ) then
    alter table public.restaurants
      add constraint restaurants_subscription_status_check
      check (subscription_status in ('active', 'trial', 'suspended'));
  end if;
end $$;

create table if not exists public.super_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.super_admins enable row level security;
alter table public.super_admins force row level security;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'super_admin'
    or coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'super_admin'
    or exists (
      select 1
      from public.super_admins sa
      where lower(sa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

grant execute on function public.is_super_admin() to anon, authenticated, service_role;

drop policy if exists super_admins_select_self on public.super_admins;
create policy super_admins_select_self
  on public.super_admins for select to authenticated
  using (public.is_super_admin());

drop policy if exists super_admins_write_self on public.super_admins;
create policy super_admins_write_self
  on public.super_admins for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists restaurants_insert_super_admin on public.restaurants;
create policy restaurants_insert_super_admin
  on public.restaurants for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists restaurants_update_super_admin on public.restaurants;
create policy restaurants_update_super_admin
  on public.restaurants for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists restaurants_delete_super_admin on public.restaurants;
create policy restaurants_delete_super_admin
  on public.restaurants for delete to authenticated
  using (public.is_super_admin());

drop policy if exists categories_write_super_admin on public.categories;
create policy categories_write_super_admin
  on public.categories for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists dishes_write_super_admin on public.dishes;
create policy dishes_write_super_admin
  on public.dishes for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists tables_write_super_admin on public.tables;
create policy tables_write_super_admin
  on public.tables for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists orders_write_super_admin on public.orders;
create policy orders_write_super_admin
  on public.orders for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists waiter_calls_write_super_admin on public.waiter_calls;
create policy waiter_calls_write_super_admin
  on public.waiter_calls for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select, insert, update, delete on table public.super_admins to authenticated;
grant all on table public.super_admins to service_role;
