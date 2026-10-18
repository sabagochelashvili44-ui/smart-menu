-- Wait-time for kitchen calls + guest intent (views / cart) — never counted as revenue.

alter table public.waiter_calls
  add column if not exists acknowledged_at timestamptz;

create table if not exists public.guest_intent_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  table_id uuid,
  dish_id text not null default '',
  dish_name text not null default '',
  event_type text not null,
  quantity integer not null default 1,
  unit_price numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint guest_intent_events_restaurant_id_fkey
    foreign key (restaurant_id)
    references public.restaurants (id)
    on update cascade
    on delete cascade,
  constraint guest_intent_events_type_check
    check (event_type in ('view', 'cart_add', 'cart_remove')),
  constraint guest_intent_events_quantity_check
    check (quantity > 0)
);

create index if not exists guest_intent_events_restaurant_created_idx
  on public.guest_intent_events (restaurant_id, created_at desc);

create index if not exists guest_intent_events_restaurant_type_idx
  on public.guest_intent_events (restaurant_id, event_type);

alter table public.guest_intent_events enable row level security;

grant select, insert on table public.guest_intent_events to anon;
grant select, insert, update, delete on table public.guest_intent_events to authenticated;
grant all on table public.guest_intent_events to service_role;

drop policy if exists guest_intent_events_insert_anon on public.guest_intent_events;
create policy guest_intent_events_insert_anon
  on public.guest_intent_events
  for insert
  to anon
  with check (true);

drop policy if exists guest_intent_events_select_authenticated on public.guest_intent_events;
create policy guest_intent_events_select_authenticated
  on public.guest_intent_events
  for select
  to authenticated
  using (true);
