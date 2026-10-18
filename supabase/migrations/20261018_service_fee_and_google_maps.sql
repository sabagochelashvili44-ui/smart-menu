alter table public.restaurants
  add column if not exists service_fee_percent numeric(5, 2) not null default 0;

alter table public.restaurants
  add column if not exists google_maps_review_url text;

update public.restaurants
set google_maps_review_url = google_review_url
where google_maps_review_url is null
  and google_review_url is not null
  and google_review_url <> '';

notify pgrst, 'reload schema';
