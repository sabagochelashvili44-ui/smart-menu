-- Public bucket for dish photos. Path: {restaurant_id}/{timestamp}-{filename}

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
