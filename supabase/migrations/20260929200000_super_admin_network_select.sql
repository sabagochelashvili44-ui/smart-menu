-- Super-admin SELECT across the full network (no restaurant_id tenant filter).

drop policy if exists restaurants_select_super_admin on public.restaurants;
create policy restaurants_select_super_admin
  on public.restaurants
  for select
  to authenticated
  using (public.is_super_admin());

drop policy if exists waiter_calls_select_super_admin on public.waiter_calls;
create policy waiter_calls_select_super_admin
  on public.waiter_calls
  for select
  to authenticated
  using (public.is_super_admin());

drop policy if exists orders_select_super_admin on public.orders;
create policy orders_select_super_admin
  on public.orders
  for select
  to authenticated
  using (public.is_super_admin());
