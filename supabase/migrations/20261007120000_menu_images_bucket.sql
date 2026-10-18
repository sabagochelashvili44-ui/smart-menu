-- Public bucket for dish photos. Path: {restaurant_id}/{timestamp}-{filename}

do $$
declare
  v_bucket constant text := 'menu-images';
  v_auth constant text := 'authenticated';
begin
  insert into storage.buckets (id, name, public)
  values (v_bucket, v_bucket, true)
  on conflict (id) do update set public = true;

  execute format('drop policy if exists menu_images_public_read on storage.objects');
  execute format(
    'create policy menu_images_public_read on storage.objects for select using (bucket_id = %L)',
    v_bucket
  );

  execute format('drop policy if exists menu_images_auth_insert on storage.objects');
  execute format(
    'create policy menu_images_auth_insert on storage.objects for insert to %I with check (bucket_id = %L)',
    v_auth,
    v_bucket
  );

  execute format('drop policy if exists menu_images_auth_update on storage.objects');
  execute format(
    'create policy menu_images_auth_update on storage.objects for update to %I using (bucket_id = %L) with check (bucket_id = %L)',
    v_auth,
    v_bucket,
    v_bucket
  );
end $$;
