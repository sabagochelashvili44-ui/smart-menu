import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { categories, dishes, restaurantName } from "./georgian-house-menu-150.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const catalog = {
  restaurant: restaurantName,
  currency: "GEL",
  categories,
  dishes,
};

const jsonPath = join(root, "data", "georgian-house-menu-150.json");
writeFileSync(jsonPath, JSON.stringify(catalog, null, 2), "utf8");

const jsonLiteral = JSON.stringify(catalog).replaceAll("'", "''");

const sql = `-- Georgian House: 150 dishes (GEL) with Georgian names/descriptions
-- Paste into Supabase → SQL Editor → Run
-- Keeps existing restaurant + tables; replaces categories and dishes for Georgian House.

do $$
declare
  rid uuid;
  payload jsonb := '${jsonLiteral}'::jsonb;
begin
  select id into rid
  from public.restaurants
  where name = 'Georgian House'
  order by created_at
  limit 1;

  if rid is null then
    insert into public.restaurants (name, logo)
    values (
      'Georgian House',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
    )
    returning id into rid;

    insert into public.tables (restaurant_id, table_number)
    values
      (rid, 'Table 1'),
      (rid, 'Table 2');
  end if;

  delete from public.dishes
  where category_id in (
    select id from public.categories where restaurant_id = rid
  );

  delete from public.categories
  where restaurant_id = rid;

  insert into public.categories (restaurant_id, name, order_index)
  select
    rid,
    cat->>'key',
    (cat->>'order_index')::integer
  from jsonb_array_elements(payload->'categories') as cat;

  insert into public.dishes (
    category_id,
    name,
    description,
    price,
    margin_score,
    image_url,
    allergens,
    is_available
  )
  select
    c.id,
    d->>'name',
    d->>'description',
    (d->>'price')::numeric,
    (d->>'margin_score')::integer,
    nullif(d->>'image_url', ''),
    coalesce(
      (
        select array_agg(a)
        from jsonb_array_elements_text(d->'allergens') as a
      ),
      '{}'::text[]
    ),
    true
  from jsonb_array_elements(payload->'dishes') as d
  join public.categories as c
    on c.restaurant_id = rid
   and c.name = d->>'category';
end $$;

select
  r.id as restaurant_id,
  (select count(*) from public.categories c where c.restaurant_id = r.id) as categories,
  (
    select count(*)
    from public.dishes d
    join public.categories c on c.id = d.category_id
    where c.restaurant_id = r.id
  ) as dishes
from public.restaurants r
where r.name = 'Georgian House'
order by r.created_at
limit 1;
`;

function sqlStr(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const sqlPath = join(root, "supabase", "seed-georgian-house-150.sql");
writeFileSync(sqlPath, sql, "utf8");

const dishValues = dishes
  .map(
    (dish) =>
      `  (${sqlStr(dish.name)}, ${sqlStr(dish.image_url)})`,
  )
  .join(",\n");

const updateSql = `-- Update image_url for Georgian House dishes (curated Wikimedia + Unsplash).
-- Run after seed, or alone if dishes already exist.

begin;

update dishes d
set image_url = v.url
from (
  values
${dishValues}
) as v(name, url)
where d.name = v.name;

commit;
`;

writeFileSync(join(root, "supabase", "update-dish-images.sql"), updateSql, "utf8");

console.log(`Wrote ${dishes.length} dishes`);
console.log(jsonPath);
console.log(sqlPath);
console.log(join(root, "supabase", "update-dish-images.sql"));
