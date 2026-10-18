import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClientCredentials } from "@/lib/supabaseClient";
import type { RestaurantBrandFields } from "@/lib/restaurant-brand";

/** Server-only client. Requires the service role so writes bypass RLS. */
export function createSupabaseAdminClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const { url, key: anonOrPlaceholder } = getSupabaseClientCredentials();

  return createClient(url, serviceRoleKey || anonOrPlaceholder, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminRestaurant = RestaurantBrandFields;

export type AdminTable = {
  id: string;
  restaurant_id: string;
  table_number: string;
};

export type AdminCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number;
};

export type AdminDish = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  margin_score: number;
  image_url: string | null;
  allergens: string[];
  ingredients: string[];
  is_available: boolean;
};

/** Resolves the signed-in manager's restaurant, or a safe fallback. Never throws. */
export async function getPrimaryRestaurant() {
  try {
    const { getActiveRestaurant } = await import("@/lib/tenant");
    return await getActiveRestaurant();
  } catch {
    return null;
  }
}
