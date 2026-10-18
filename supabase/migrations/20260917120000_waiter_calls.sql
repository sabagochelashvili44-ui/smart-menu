-- Waiter-call alerts (not kitchen order tickets)

create table if not exists public.waiter_calls (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  table_id uuid not null,
  table_number text not null default '',
  items jsonb not null default '[]'::jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint waiter_calls_restaurant_id_fkey
    foreign key (restaurant_id)
    references public.restaurants (id)
    on update cascade
    on delete cascade,
  constraint waiter_calls_table_restaurant_fkey
    foreign key (table_id, restaurant_id)
    references public.tables (id, restaurant_id)
    on update cascade
    on delete cascade,
  constraint waiter_calls_status_check
    check (status in ('open', 'acknowledged'))
);

create index if not exists waiter_calls_restaurant_created_idx
  on public.waiter_calls (restaurant_id, created_at desc);

create index if not exists waiter_calls_open_idx
  on public.waiter_calls (restaurant_id, status)
  where status = 'open';

alter table public.waiter_calls enable row level security;
alter table public.waiter_calls replica identity full;

drop policy if exists waiter_calls_select_authenticated on public.waiter_calls;
create policy waiter_calls_select_authenticated
  on public.waiter_calls
  for select
  to authenticated
  using (true);

do $$
begin
  alter publication supabase_realtime add table public.waiter_calls;
exception
  when duplicate_object then
    null;
end;
$$;
