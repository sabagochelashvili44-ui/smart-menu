import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  isUuid,
  RESTAURANT_BRAND_SELECT,
  restaurantLogo,
  type RestaurantBrandFields,
} from "@/lib/restaurant-brand";
import type { SupabaseClient } from "@supabase/supabase-js";

type TableRow = {
  id: string;
  restaurant_id: string;
  table_number: string;
};

type CategoryRow = {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number;
};

type DishRow = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  allergens: string[] | null;
  is_available: boolean;
  ingredients?: string[] | null;
  wine_pairing?: string | null;
};

export type GuestMenuRestaurant = RestaurantBrandFields & {
  logo: string | null;
};

const DISH_SELECT_FULL =
  "id, category_id, name, description, price, image_url, allergens, is_available, ingredients, wine_pairing";
const DISH_SELECT_CORE =
  "id, category_id, name, description, price, image_url, allergens, is_available";

async function fetchRestaurant(slugOrId: string) {
  const supabase = createSupabaseAdminClient();
  const branded = supabase.from("restaurants").select(RESTAURANT_BRAND_SELECT);
  const legacy = supabase
    .from("restaurants")
    .select(
      "id, name, slug, logo, logo_url, primary_color, secondary_color, bg_color, font",
    );

  if (isUuid(slugOrId)) {
    const { data, error } = await branded
      .eq("id", slugOrId)
      .maybeSingle<RestaurantBrandFields>();
    if (!error && data) return data;
    const fallback = await legacy
      .eq("id", slugOrId)
      .maybeSingle<RestaurantBrandFields>();
    if (!fallback.error && fallback.data) return fallback.data;
    const minimal = await supabase
      .from("restaurants")
      .select("id, name, logo")
      .eq("id", slugOrId)
      .maybeSingle<RestaurantBrandFields>();
    return minimal.data ?? null;
  }

  const slug = slugOrId.toLowerCase();
  const { data, error } = await branded
    .eq("slug", slug)
    .maybeSingle<RestaurantBrandFields>();
  if (!error && data) return data;
  const fallback = await legacy
    .eq("slug", slug)
    .maybeSingle<RestaurantBrandFields>();
  return fallback.data ?? null;
}

async function selectDishes(
  supabase: SupabaseClient,
  select: string,
  restaurantId: string,
  categoryIds: string[],
) {
  const byRestaurant = await supabase
    .from("dishes")
    .select(select)
    .eq("restaurant_id", restaurantId)
    .returns<DishRow[]>();

  if (!byRestaurant.error) {
    const rows = byRestaurant.data ?? [];
    if (rows.length > 0 || categoryIds.length === 0) {
      return { data: rows, error: null };
    }
  }

  const restaurantIdMissing =
    byRestaurant.error && /restaurant_id/i.test(byRestaurant.error.message);
  if (byRestaurant.error && !restaurantIdMissing) {
    return byRestaurant;
  }

  if (categoryIds.length === 0) {
    return { data: [] as DishRow[], error: null };
  }

  return supabase
    .from("dishes")
    .select(select)
    .in("category_id", categoryIds)
    .returns<DishRow[]>();
}

async function fetchRestaurantDishes(
  supabase: SupabaseClient,
  restaurantId: string,
  categoryIds: string[],
) {
  let result = await selectDishes(
    supabase,
    DISH_SELECT_FULL,
    restaurantId,
    categoryIds,
  );
  if (result.error && /ingredients|wine_pairing/i.test(result.error.message)) {
    result = await selectDishes(
      supabase,
      DISH_SELECT_CORE,
      restaurantId,
      categoryIds,
    );
  }
  if (result.error) {
    console.error("[guest-menu] dishes query failed", result.error.message);
    return [] as DishRow[];
  }
  return result.data ?? [];
}

export async function loadGuestMenu(
  restaurantSlug: string,
  tableId?: string,
) {
  const restaurantRow = await fetchRestaurant(restaurantSlug);
  if (!restaurantRow) return null;

  const restaurant: GuestMenuRestaurant = {
    ...restaurantRow,
    logo: restaurantLogo(restaurantRow),
  };

  const supabase = createSupabaseAdminClient();
  let table: TableRow | null = null;

  if (tableId) {
    const tableQuery = supabase
      .from("tables")
      .select("id, restaurant_id, table_number")
      .eq("restaurant_id", restaurant.id);

    const { data, error } = isUuid(tableId)
      ? await tableQuery.eq("id", tableId).maybeSingle<TableRow>()
      : await tableQuery.eq("table_number", tableId).maybeSingle<TableRow>();

    if (error || !data) return null;
    table = data;
  }

  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, restaurant_id, name, order_index")
    .eq("restaurant_id", restaurant.id)
    .order("order_index", { ascending: true })
    .returns<CategoryRow[]>();

  if (categoryError) {
    console.error("[guest-menu] categories query failed", categoryError.message);
  }

  const categoryRows = categories ?? [];
  const categoryIds = categoryRows.map((category) => category.id);
  const dishes = await fetchRestaurantDishes(
    supabase,
    restaurant.id,
    categoryIds,
  );

  return {
    restaurant,
    table,
    categories: categoryRows,
    dishes,
  };
}
