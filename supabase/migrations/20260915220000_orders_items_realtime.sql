-- Line items on tickets + Realtime for the kitchen display

alter table public.orders
  add column if not exists items jsonb not null default '[]'::jsonb;

alter table public.orders replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then
    null;
end;
$$;
