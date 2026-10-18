-- Public bucket for dish photos. Path: {restaurant_id}/{timestamp}-{filename}

insert into storage.buckets (id, name, public)
values ('dishes', 'dishes', true)
on conflict (id) do update set public = true;

drop policy if exists dishes_images_public_read on storage.objects;
create policy dishes_images_public_read
  on storage.objects for select
  using (bucket_id = 'dishes');

drop policy if exists dishes_images_auth_insert on storage.objects;
create policy dishes_images_auth_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'dishes');

drop policy if exists dishes_images_auth_update on storage.objects;
create policy dishes_images_auth_update
  on storage.objects for update to authenticated
  using (bucket_id = 'dishes')
  with check (bucket_id = 'dishes');

drop policy if exists dishes_images_service_all on storage.objects;
create policy dishes_images_service_all
  on storage.objects for all to service_role
  using (bucket_id = 'dishes')
  with check (bucket_id = 'dishes');
