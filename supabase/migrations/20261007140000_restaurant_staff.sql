-- Per-tenant staff roles: owner, manager, waiter.

create table if not exists public.restaurant_staff (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  email text not null,
  role text not null default 'waiter',
  created_at timestamptz not null default now(),
  constraint restaurant_staff_role_check
    check (role in ('owner', 'manager', 'waiter')),
  constraint restaurant_staff_email_check
    check (char_length(btrim(email)) > 2)
);

create unique index if not exists restaurant_staff_restaurant_email_key
  on public.restaurant_staff (restaurant_id, lower(trim(email)));

create index if not exists restaurant_staff_email_idx
  on public.restaurant_staff (lower(trim(email)));

alter table public.restaurant_staff enable row level security;
alter table public.restaurant_staff force row level security;

create or replace function public.jwt_email()
returns text
language sql
stable
as $$
  select lower(trim(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.is_restaurant_owner(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or (
      public.jwt_email() <> ''
      and (
        exists (
          select 1
          from public.restaurants r
          where r.id = p_restaurant_id
            and lower(trim(coalesce(r.manager_email, ''))) = public.jwt_email()
        )
        or exists (
          select 1
          from public.restaurant_staff s
          where s.restaurant_id = p_restaurant_id
            and s.role = 'owner'
            and lower(trim(s.email)) = public.jwt_email()
        )
      )
    );
$$;

grant execute on function public.jwt_email() to anon, authenticated, service_role;
grant execute on function public.is_restaurant_owner(uuid) to anon, authenticated, service_role;

drop policy if exists restaurant_staff_select on public.restaurant_staff;
create policy restaurant_staff_select
  on public.restaurant_staff
  for select
  to authenticated
  using (
    public.is_super_admin()
    or lower(trim(email)) = public.jwt_email()
    or public.is_restaurant_owner(restaurant_id)
  );

drop policy if exists restaurant_staff_insert on public.restaurant_staff;
create policy restaurant_staff_insert
  on public.restaurant_staff
  for insert
  to authenticated
  with check (public.is_restaurant_owner(restaurant_id));

drop policy if exists restaurant_staff_update on public.restaurant_staff;
create policy restaurant_staff_update
  on public.restaurant_staff
  for update
  to authenticated
  using (public.is_restaurant_owner(restaurant_id))
  with check (public.is_restaurant_owner(restaurant_id));

drop policy if exists restaurant_staff_delete on public.restaurant_staff;
create policy restaurant_staff_delete
  on public.restaurant_staff
  for delete
  to authenticated
  using (public.is_restaurant_owner(restaurant_id));

drop policy if exists restaurants_select_own_manager on public.restaurants;
create policy restaurants_select_own_manager
  on public.restaurants
  for select
  to authenticated
  using (
    public.is_super_admin()
    or (
      public.jwt_email() <> ''
      and (
        lower(trim(coalesce(manager_email, ''))) = public.jwt_email()
        or exists (
          select 1
          from public.restaurant_staff s
          where s.restaurant_id = restaurants.id
            and lower(trim(s.email)) = public.jwt_email()
        )
      )
    )
  );
