-- Multi-tenant restaurant branding. Run in Supabase → SQL Editor.
-- See also: supabase/migrations/20260928180000_restaurant_branding.sql

alter table public.restaurants
  add column if not exists slug text,
  add column if not exists logo_url text,
  add column if not exists primary_color text,
  add column if not exists secondary_color text,
  add column if not exists bg_color text,
  add column if not exists font text;

update public.restaurants
set
  logo_url = coalesce(nullif(logo_url, ''), logo),
  primary_color = coalesce(nullif(primary_color, ''), '#6d0808'),
  secondary_color = coalesce(nullif(secondary_color, ''), '#757d6f'),
  bg_color = coalesce(nullif(bg_color, ''), '#eeead7'),
  font = coalesce(nullif(font, ''), 'noto-sans-georgian')
where true;

update public.restaurants
set slug = 'georgian-house'
where name = 'Georgian House'
  and (slug is null or btrim(slug) = '');

update public.restaurants
set slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
where slug is null or btrim(slug) = '';

create unique index if not exists restaurants_slug_key
  on public.restaurants (slug)
  where slug is not null and btrim(slug) <> '';

alter table public.dishes
  add column if not exists restaurant_id uuid;

update public.dishes d
set restaurant_id = c.restaurant_id
from public.categories c
where d.category_id = c.id
  and d.restaurant_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dishes_restaurant_id_fkey'
  ) then
    alter table public.dishes
      add constraint dishes_restaurant_id_fkey
      foreign key (restaurant_id)
      references public.restaurants (id)
      on update cascade
      on delete cascade;
  end if;
end $$;

create index if not exists dishes_restaurant_id_idx
  on public.dishes (restaurant_id);

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = true;

drop policy if exists branding_public_read on storage.objects;
create policy branding_public_read
  on storage.objects for select
  using (bucket_id = 'branding');

drop policy if exists branding_auth_insert on storage.objects;
create policy branding_auth_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'branding');

drop policy if exists branding_auth_update on storage.objects;
create policy branding_auth_update
  on storage.objects for update to authenticated
  using (bucket_id = 'branding')
  with check (bucket_id = 'branding');

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set public = true;

drop policy if exists menu_images_public_read on storage.objects;
create policy menu_images_public_read
  on storage.objects for select
  using (bucket_id = 'menu-images');

drop policy if exists menu_images_auth_insert on storage.objects;
create policy menu_images_auth_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images');

drop policy if exists menu_images_auth_update on storage.objects;
create policy menu_images_auth_update
  on storage.objects for update to authenticated
  using (bucket_id = 'menu-images')
  with check (bucket_id = 'menu-images');
