-- =============================================================================
-- Smart AI Menu — complete Supabase schema
-- Paste into: Dashboard → SQL Editor → Run
-- Roles: anon (QR guests) | authenticated (restaurant staff)
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Reset policies so this script is re-runnable
-- -----------------------------------------------------------------------------

drop policy if exists restaurants_select_anon on public.restaurants;
drop policy if exists restaurants_select_authenticated on public.restaurants;
drop policy if exists restaurants_insert_authenticated on public.restaurants;
drop policy if exists restaurants_update_authenticated on public.restaurants;
drop policy if exists restaurants_delete_authenticated on public.restaurants;
drop policy if exists restaurants_select_public on public.restaurants;
drop policy if exists restaurants_write_authenticated on public.restaurants;

drop policy if exists tables_select_anon on public.tables;
drop policy if exists tables_select_authenticated on public.tables;
drop policy if exists tables_insert_authenticated on public.tables;
drop policy if exists tables_update_authenticated on public.tables;
drop policy if exists tables_delete_authenticated on public.tables;
drop policy if exists tables_select_public on public.tables;
drop policy if exists tables_write_authenticated on public.tables;

drop policy if exists categories_select_anon on public.categories;
drop policy if exists categories_select_authenticated on public.categories;
drop policy if exists categories_insert_authenticated on public.categories;
drop policy if exists categories_update_authenticated on public.categories;
drop policy if exists categories_delete_authenticated on public.categories;
drop policy if exists categories_select_public on public.categories;
drop policy if exists categories_write_authenticated on public.categories;

drop policy if exists dishes_select_anon on public.dishes;
drop policy if exists dishes_select_authenticated on public.dishes;
drop policy if exists dishes_insert_authenticated on public.dishes;
drop policy if exists dishes_update_authenticated on public.dishes;
drop policy if exists dishes_delete_authenticated on public.dishes;
drop policy if exists dishes_select_public on public.dishes;
drop policy if exists dishes_write_authenticated on public.dishes;

drop policy if exists orders_select_anon on public.orders;
drop policy if exists orders_select_authenticated on public.orders;
drop policy if exists orders_insert_anon on public.orders;
drop policy if exists orders_insert_authenticated on public.orders;
drop policy if exists orders_update_authenticated on public.orders;
drop policy if exists orders_delete_authenticated on public.orders;
drop policy if exists orders_select_public on public.orders;
drop policy if exists orders_insert_public on public.orders;

drop policy if exists reviews_select_anon on public.reviews;
drop policy if exists reviews_select_authenticated on public.reviews;
drop policy if exists reviews_insert_anon on public.reviews;
drop policy if exists reviews_insert_authenticated on public.reviews;
drop policy if exists reviews_update_authenticated on public.reviews;
drop policy if exists reviews_delete_authenticated on public.reviews;
drop policy if exists reviews_select_public on public.reviews;
drop policy if exists reviews_insert_public on public.reviews;

-- -----------------------------------------------------------------------------
-- Tables, foreign keys, cascade rules
-- -----------------------------------------------------------------------------

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text,
  created_at timestamptz not null default now()
);

create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  table_number text not null,
  constraint tables_restaurant_id_fkey
    foreign key (restaurant_id)
    references public.restaurants (id)
    on update cascade
    on delete cascade,
  constraint tables_restaurant_number_key
    unique (restaurant_id, table_number),
  constraint tables_id_restaurant_key
    unique (id, restaurant_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  name text not null,
  order_index integer not null default 0,
  constraint categories_restaurant_id_fkey
    foreign key (restaurant_id)
    references public.restaurants (id)
    on update cascade
    on delete cascade,
  constraint categories_order_index_check
    check (order_index >= 0)
);

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null,
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null,
  margin_score integer not null default 5,
  image_url text,
  allergens text[] not null default '{}',
  is_available boolean not null default true,
  constraint dishes_category_id_fkey
    foreign key (category_id)
    references public.categories (id)
    on update cascade
    on delete cascade,
  constraint dishes_price_check
    check (price >= 0),
  constraint dishes_margin_score_check
    check (margin_score between 0 and 12)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  table_id uuid not null,
  status text not null default 'pending',
  total_amount numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint orders_restaurant_id_fkey
    foreign key (restaurant_id)
    references public.restaurants (id)
    on update cascade
    on delete cascade,
  constraint orders_table_restaurant_fkey
    foreign key (table_id, restaurant_id)
    references public.tables (id, restaurant_id)
    on update cascade
    on delete restrict,
  constraint orders_status_check
    check (status in ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  constraint orders_total_amount_check
    check (total_amount >= 0)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  rating integer not null,
  feedback text not null,
  created_at timestamptz not null default now(),
  constraint reviews_restaurant_id_fkey
    foreign key (restaurant_id)
    references public.restaurants (id)
    on update cascade
    on delete cascade,
  constraint reviews_rating_check
    check (rating between 1 and 5),
  constraint reviews_feedback_check
    check (char_length(btrim(feedback)) > 0)
);

-- -----------------------------------------------------------------------------
-- Indexes (btree, composite, GIN, partial)
-- -----------------------------------------------------------------------------

create index if not exists tables_restaurant_id_idx
  on public.tables (restaurant_id);

create index if not exists categories_restaurant_id_idx
  on public.categories (restaurant_id);

create index if not exists categories_restaurant_id_order_idx
  on public.categories (restaurant_id, order_index);

create index if not exists dishes_category_id_idx
  on public.dishes (category_id);

-- Partial: kitchen/menu only needs in-stock items on the QR catalog
create index if not exists dishes_available_partial_idx
  on public.dishes (category_id, name)
  where is_available = true;

-- GIN: allergen filters ("contains gluten", overlap queries)
create index if not exists dishes_allergens_gin_idx
  on public.dishes using gin (allergens);

create index if not exists orders_restaurant_id_idx
  on public.orders (restaurant_id);

create index if not exists orders_table_id_idx
  on public.orders (table_id);

create index if not exists orders_restaurant_id_status_idx
  on public.orders (restaurant_id, status);

create index if not exists orders_restaurant_id_created_at_idx
  on public.orders (restaurant_id, created_at desc);

-- Partial: live KDS tickets (not finished)
create index if not exists orders_open_partial_idx
  on public.orders (restaurant_id, created_at desc)
  where status in ('pending', 'preparing', 'ready');

create index if not exists reviews_restaurant_id_idx
  on public.reviews (restaurant_id);

create index if not exists reviews_restaurant_id_created_at_idx
  on public.reviews (restaurant_id, created_at desc);

-- Partial: disaster / negative-review mitigation
create index if not exists reviews_low_rating_partial_idx
  on public.reviews (restaurant_id, created_at desc)
  where rating <= 2;

-- -----------------------------------------------------------------------------
-- Privileges (RLS is ignored if GRANT is missing)
-- -----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant select on table
  public.restaurants,
  public.tables,
  public.categories,
  public.dishes,
  public.orders,
  public.reviews
to anon;

grant insert on table
  public.orders,
  public.reviews
to anon;

grant select, insert, update, delete on table
  public.restaurants,
  public.tables,
  public.categories,
  public.dishes,
  public.orders,
  public.reviews
to authenticated;

grant all on table
  public.restaurants,
  public.tables,
  public.categories,
  public.dishes,
  public.orders,
  public.reviews
to service_role;

-- -----------------------------------------------------------------------------
-- Enable RLS on every table (forced so table owners cannot skip it)
-- -----------------------------------------------------------------------------

alter table public.restaurants enable row level security;
alter table public.tables enable row level security;
alter table public.categories enable row level security;
alter table public.dishes enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;

alter table public.restaurants force row level security;
alter table public.tables force row level security;
alter table public.categories force row level security;
alter table public.dishes force row level security;
alter table public.orders force row level security;
alter table public.reviews force row level security;

-- -----------------------------------------------------------------------------
-- RLS policies
-- anon          = QR guests (read menu, place order, leave review, track order)
-- authenticated = staff (full catalog + KDS status + review moderation)
-- -----------------------------------------------------------------------------

-- restaurants
create policy restaurants_select_anon
  on public.restaurants
  for select
  to anon
  using (true);

create policy restaurants_select_authenticated
  on public.restaurants
  for select
  to authenticated
  using (true);

create policy restaurants_insert_authenticated
  on public.restaurants
  for insert
  to authenticated
  with check (true);

create policy restaurants_update_authenticated
  on public.restaurants
  for update
  to authenticated
  using (true)
  with check (true);

create policy restaurants_delete_authenticated
  on public.restaurants
  for delete
  to authenticated
  using (true);

-- tables
create policy tables_select_anon
  on public.tables
  for select
  to anon
  using (true);

create policy tables_select_authenticated
  on public.tables
  for select
  to authenticated
  using (true);

create policy tables_insert_authenticated
  on public.tables
  for insert
  to authenticated
  with check (true);

create policy tables_update_authenticated
  on public.tables
  for update
  to authenticated
  using (true)
  with check (true);

create policy tables_delete_authenticated
  on public.tables
  for delete
  to authenticated
  using (true);

-- categories
create policy categories_select_anon
  on public.categories
  for select
  to anon
  using (true);

create policy categories_select_authenticated
  on public.categories
  for select
  to authenticated
  using (true);

create policy categories_insert_authenticated
  on public.categories
  for insert
  to authenticated
  with check (true);

create policy categories_update_authenticated
  on public.categories
  for update
  to authenticated
  using (true)
  with check (true);

create policy categories_delete_authenticated
  on public.categories
  for delete
  to authenticated
  using (true);

-- dishes
create policy dishes_select_anon
  on public.dishes
  for select
  to anon
  using (true);

create policy dishes_select_authenticated
  on public.dishes
  for select
  to authenticated
  using (true);

create policy dishes_insert_authenticated
  on public.dishes
  for insert
  to authenticated
  with check (true);

create policy dishes_update_authenticated
  on public.dishes
  for update
  to authenticated
  using (true)
  with check (true);

create policy dishes_delete_authenticated
  on public.dishes
  for delete
  to authenticated
  using (true);

-- orders
create policy orders_select_anon
  on public.orders
  for select
  to anon
  using (true);

create policy orders_select_authenticated
  on public.orders
  for select
  to authenticated
  using (true);

create policy orders_insert_anon
  on public.orders
  for insert
  to anon
  with check (true);

create policy orders_insert_authenticated
  on public.orders
  for insert
  to authenticated
  with check (true);

create policy orders_update_authenticated
  on public.orders
  for update
  to authenticated
  using (true)
  with check (true);

create policy orders_delete_authenticated
  on public.orders
  for delete
  to authenticated
  using (true);

-- reviews
create policy reviews_select_anon
  on public.reviews
  for select
  to anon
  using (true);

create policy reviews_select_authenticated
  on public.reviews
  for select
  to authenticated
  using (true);

create policy reviews_insert_anon
  on public.reviews
  for insert
  to anon
  with check (true);

create policy reviews_insert_authenticated
  on public.reviews
  for insert
  to authenticated
  with check (true);

create policy reviews_update_authenticated
  on public.reviews
  for update
  to authenticated
  using (true)
  with check (true);

create policy reviews_delete_authenticated
  on public.reviews
  for delete
  to authenticated
  using (true);
