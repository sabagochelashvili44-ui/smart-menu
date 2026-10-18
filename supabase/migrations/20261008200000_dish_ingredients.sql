alter table public.dishes
  add column if not exists ingredients text[] not null default '{}';

create index if not exists dishes_ingredients_gin_idx
  on public.dishes using gin (ingredients);
