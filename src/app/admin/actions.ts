"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminUser } from "@/lib/supabase/server";
import {
  createSupabaseAdminClient,
  type AdminCategory,
  type AdminDish,
  type AdminTable,
} from "@/lib/supabaseAdmin";
import { getActiveRestaurant, requireTenantRestaurant, TENANT_CACHE_TAG } from "@/lib/tenant";
import {
  BRAND_FONTS,
  DEFAULT_BRAND,
  normalizeHex,
  restaurantLogo,
  slugifyRestaurant,
} from "@/lib/restaurant-brand";
import { toShiftNote, type ShiftNote } from "@/lib/shift-notes";
import { selectWaiterCalls } from "@/lib/waiter-calls-query";
import {
  parseWaiterCallType,
  type WaiterCallType,
} from "@/lib/waiter-call-types";

export async function loadAdminTables() {
  await requireAdminUser();
  const restaurant = await getActiveRestaurant();
  if (!restaurant) {
    return { restaurant: null, tables: [] as AdminTable[] };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tables")
    .select("id, restaurant_id, table_number")
    .eq("restaurant_id", restaurant.id)
    .order("table_number");

  if (error) {
    throw new Error(error.message);
  }

  return { restaurant, tables: (data ?? []) as AdminTable[] };
}

export async function addAdminTable(tableNumber: string) {
  await requireAdminUser();
  const restaurant = await getActiveRestaurant();
  if (!restaurant) {
    return { error: "No restaurant found in Supabase.", table: null };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tables")
    .insert({
      restaurant_id: restaurant.id,
      table_number: tableNumber.trim(),
    })
    .select("id, restaurant_id, table_number")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not add table.", table: null };
  }

  revalidatePath("/admin/tables");
  return { error: null, table: data as AdminTable };
}

export async function loadAdminMenu() {
  await requireAdminUser();
  const restaurant = await getActiveRestaurant();
  if (!restaurant) {
    return {
      restaurant: null,
      categories: [] as AdminCategory[],
      dishes: [] as AdminDish[],
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, restaurant_id, name, order_index")
    .eq("restaurant_id", restaurant.id)
    .order("order_index");

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  const categoryRows = (categories ?? []) as AdminCategory[];
  const categoryIds = categoryRows.map((row) => row.id);
  const dishSelect =
    "id, category_id, name, description, price, margin_score, image_url, allergens, ingredients, is_available";
  const dishSelectCore =
    "id, category_id, name, description, price, margin_score, image_url, allergens, is_available";

  let dishRows: AdminDish[] | null = [];
  let dishError = null as { message: string } | null;

  const byRestaurant = await supabase
    .from("dishes")
    .select(dishSelect)
    .eq("restaurant_id", restaurant.id)
    .order("name");
  dishRows = byRestaurant.data as AdminDish[] | null;
  dishError = byRestaurant.error;

  if (dishError && /ingredients/i.test(dishError.message)) {
    const withoutIngredients = await supabase
      .from("dishes")
      .select(dishSelectCore)
      .eq("restaurant_id", restaurant.id)
      .order("name");
    dishRows = withoutIngredients.data as AdminDish[] | null;
    dishError = withoutIngredients.error;
  }

  if (dishError && /restaurant_id/i.test(dishError.message) && categoryIds.length > 0) {
    const byCategory = await supabase
      .from("dishes")
      .select(dishSelect)
      .in("category_id", categoryIds)
      .order("name");
    dishRows = byCategory.data as AdminDish[] | null;
    dishError = byCategory.error;
  } else if (
    !dishError &&
    (dishRows ?? []).length === 0 &&
    categoryIds.length > 0
  ) {
    const byCategory = await supabase
      .from("dishes")
      .select(dishSelect)
      .in("category_id", categoryIds)
      .order("name");
    if (!byCategory.error) {
      dishRows = byCategory.data as AdminDish[] | null;
    }
  }

  if (dishError) {
    console.error("[admin-menu] dishes query failed", dishError.message);
    dishRows = [];
  }

  const dishes = ((dishRows ?? []) as AdminDish[]).map((dish) =>
    toAdminDish(dish as unknown as Record<string, unknown>),
  );

  return { restaurant, categories: categoryRows, dishes };
}

export async function saveAdminCategory(input: { id?: string; name: string }) {
  await requireAdminUser();
  const restaurant = await getActiveRestaurant();
  if (!restaurant) {
    return { error: "No restaurant linked to this account.", category: null };
  }

  const name = input.name.trim();
  if (!name) {
    return { error: "Category name is required.", category: null };
  }

  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("categories")
    .select("order_index")
    .eq("restaurant_id", restaurant.id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextIndex = Number(existing?.order_index ?? 0) + 1;

  const query = input.id
    ? supabase
        .from("categories")
        .update({ name })
        .eq("id", input.id)
        .eq("restaurant_id", restaurant.id)
    : supabase.from("categories").insert({
        restaurant_id: restaurant.id,
        name,
        order_index: nextIndex,
      });

  const { data, error } = await query
    .select("id, restaurant_id, name, order_index")
    .maybeSingle();

  if (error) {
    return { error: error.message, category: null };
  }
  if (!data) {
    return { error: "Category could not be saved.", category: null };
  }

  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  return { error: null, category: data as AdminCategory };
}

export async function deleteAdminCategory(id: string) {
  await requireAdminUser();
  const restaurant = await getActiveRestaurant();
  if (!restaurant) {
    return { error: "No restaurant linked to this account." };
  }

  const supabase = createSupabaseAdminClient();
  const { data: owned } = await supabase
    .from("categories")
    .select("id")
    .eq("id", id)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  if (!owned) {
    return { error: "Category not found." };
  }

  const byRestaurant = await supabase
    .from("dishes")
    .delete()
    .eq("category_id", id)
    .eq("restaurant_id", restaurant.id);

  if (byRestaurant.error && /restaurant_id/i.test(byRestaurant.error.message)) {
    const fallback = await supabase.from("dishes").delete().eq("category_id", id);
    if (fallback.error) {
      return { error: fallback.error.message };
    }
  } else if (byRestaurant.error) {
    return { error: byRestaurant.error.message };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/menu");
  revalidatePath("/menu", "layout");
  return { error: null };
}

const DISH_COLUMNS =
  "id, category_id, name, description, price, margin_score, image_url, allergens, ingredients, is_available";
const DISH_COLUMNS_CORE =
  "id, category_id, name, description, price, margin_score, image_url, allergens, is_available";

function parseTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      /* comma-separated fallback */
    }
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toAdminDish(row: Record<string, unknown>): AdminDish {
  return {
    id: String(row.id),
    category_id: String(row.category_id),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    price: Number(row.price) || 0,
    margin_score: Number(row.margin_score) || 0,
    image_url: row.image_url ? String(row.image_url) : null,
    allergens: parseTextList(row.allergens),
    ingredients: parseTextList(row.ingredients),
    is_available: Boolean(row.is_available),
  };
}

export async function toggleAdminDish(id: string, isAvailable: boolean) {
  await requireAdminUser();
  const restaurant = await getActiveRestaurant();
  if (!restaurant) {
    return { error: "No restaurant linked to this account.", dish: null };
  }
  const supabase = createSupabaseAdminClient();
  let result = await supabase
    .from("dishes")
    .update({ is_available: isAvailable })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id)
    .select(DISH_COLUMNS)
    .maybeSingle();

  if (result.error && /ingredients/i.test(result.error.message)) {
    result = await supabase
      .from("dishes")
      .update({ is_available: isAvailable })
      .eq("id", id)
      .eq("restaurant_id", restaurant.id)
      .select(DISH_COLUMNS_CORE)
      .maybeSingle();
  }

  if (result.error) {
    return { error: result.error.message, dish: null };
  }
  if (!result.data) {
    return { error: "Dish not found.", dish: null };
  }

  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  return {
    error: null,
    dish: toAdminDish(result.data as unknown as Record<string, unknown>),
  };
}

export type DishInput = {
  id?: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  allergens: string[];
  ingredients: string[];
  is_available: boolean;
};

export async function saveAdminDish(input: DishInput) {
  await requireAdminUser();
  const restaurant = await getActiveRestaurant();
  if (!restaurant) {
    return { error: "No restaurant found in Supabase.", dish: null };
  }

  const supabase = createSupabaseAdminClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id, restaurant_id")
    .eq("id", input.category_id)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();
  if (!category) {
    return { error: "Category does not belong to this restaurant.", dish: null };
  }

  const restaurantId = restaurant.id;
  const payload = {
    category_id: input.category_id,
    restaurant_id: restaurantId,
    name: input.name.trim(),
    description: input.description.trim() || "",
    price: input.price,
    image_url: input.image_url.trim() || null,
    allergens: input.allergens,
    ingredients: input.ingredients,
    is_available: input.is_available,
  };

  const write = (body: typeof payload | Omit<typeof payload, "ingredients" | "restaurant_id"> | Omit<typeof payload, "restaurant_id">) =>
    input.id
      ? supabase
          .from("dishes")
          .update(body)
          .eq("id", input.id)
          .eq("restaurant_id", restaurantId)
      : supabase.from("dishes").insert({ ...body, margin_score: 5 });

  let result = await write(payload).select(DISH_COLUMNS).maybeSingle();
  if (result.error && /restaurant_id/i.test(result.error.message)) {
    const { restaurant_id: _rid, ...withoutRestaurant } = payload;
    void _rid;
    result = await (input.id
      ? supabase.from("dishes").update(withoutRestaurant).eq("id", input.id)
      : supabase.from("dishes").insert({ ...withoutRestaurant, margin_score: 5 })
    )
      .select(DISH_COLUMNS)
      .maybeSingle();
  }
  if (result.error && /ingredients/i.test(result.error.message)) {
    const { ingredients: _ing, restaurant_id: _rid, ...withoutIngredients } = payload;
    void _ing;
    void _rid;
    result = await write(withoutIngredients)
      .select(DISH_COLUMNS_CORE)
      .maybeSingle();
  }
  if (result.error) {
    return { error: result.error.message, dish: null };
  }
  if (!result.data) {
    return { error: "Dish could not be saved.", dish: null };
  }

  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  return {
    error: null,
    dish: toAdminDish(result.data as unknown as Record<string, unknown>),
  };
}

const MAX_MENU_IMAGE_BYTES = 2 * 1024 * 1024;

export async function uploadMenuDishImage(formData: FormData) {
  await requireAdminUser();
  const restaurant = await getActiveRestaurant();
  if (!restaurant) {
    return { error: "No restaurant found in Supabase.", url: null as string | null };
  }

  const file = formData.get("image") as File | null;
  if (!file || file.size <= 0) {
    return { error: "Choose an image file.", url: null };
  }
  if (file.size > MAX_MENU_IMAGE_BYTES) {
    return { error: "Image must be 2 MB or smaller.", url: null };
  }
  if (file.type && !file.type.startsWith("image/")) {
    return { error: "Only image files are allowed.", url: null };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "dish";
  const filePath = `${restaurant.id}/${Date.now()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const supabase = createSupabaseAdminClient();
  const buckets = ["dishes", "menu-images"] as const;
  let uploadErrorMessage = "";

  for (const bucket of buckets) {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, bytes, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });
    if (!uploadError) {
      const publicUrl = supabase.storage.from(bucket).getPublicUrl(filePath)
        .data.publicUrl;
      return { error: null as string | null, url: publicUrl };
    }
    uploadErrorMessage = uploadError.message;
  }

  return {
    error: `Image upload failed (${uploadErrorMessage}). Create the dishes bucket (supabase/migrations/20261008210000_dishes_storage_bucket.sql).`,
    url: null,
  };
}

export async function deleteAdminDish(id: string) {
  await requireAdminUser();
  const restaurant = await getActiveRestaurant();
  if (!restaurant) {
    return { error: "No restaurant linked to this account." };
  }
  const supabase = createSupabaseAdminClient();
  let { data, error } = await supabase
    .from("dishes")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurant.id)
    .select("id")
    .maybeSingle();

  if ((error && /restaurant_id/i.test(error.message)) || (!error && !data)) {
    const existing = await supabase
      .from("dishes")
      .select("id, category_id")
      .eq("id", id)
      .maybeSingle();
    if (existing.data?.category_id) {
      const owned = await supabase
        .from("categories")
        .select("id")
        .eq("id", existing.data.category_id)
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();
      if (owned.data) {
        const retry = await supabase
          .from("dishes")
          .delete()
          .eq("id", id)
          .select("id")
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      }
    }
  }

  if (error) {
    return { error: error.message };
  }
  if (!data) {
    return { error: "Dish not found." };
  }

  revalidatePath("/admin/menu");
  revalidatePath("/menu", "layout");
  return { error: null };
}

export type KitchenTicketItem = {
  dish_id: string;
  name: string;
  quantity: number;
  unit_price: number;
};

export type KitchenTicket = {
  id: string;
  restaurant_id: string;
  table_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: KitchenTicketItem[];
};

function parseTicketItems(raw: unknown): KitchenTicketItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        dish_id: String(row.dish_id ?? ""),
        name: String(row.name ?? "Item"),
        quantity: Number(row.quantity) || 0,
        unit_price: Number(row.unit_price) || 0,
      };
    })
    .filter((item) => item.quantity > 0);
}

export type WaiterCallAlert = {
  id: string;
  restaurant_id: string;
  table_id: string;
  table_number: string;
  items: KitchenTicketItem[];
  status: string;
  call_type: WaiterCallType | null;
  created_at: string;
};

function parseCallItems(raw: unknown): KitchenTicketItem[] {
  return parseTicketItems(raw);
}

export async function loadKitchenOrders() {
  await requireAdminUser();
  const restaurant = await getActiveRestaurant();
  if (!restaurant) {
    return {
      restaurant: null,
      waiterCalls: [] as WaiterCallAlert[],
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await selectWaiterCalls(supabase, restaurant.id);

  if (error) {
    return { restaurant, waiterCalls: [] as WaiterCallAlert[] };
  }

  const waiterCalls = (data ?? []).map((row) => {
    const call = row as Omit<WaiterCallAlert, "items" | "call_type"> & {
      items: unknown;
      call_type?: unknown;
    };
    const status = String(call.status ?? "open").toLowerCase();
    const normalized =
      status === "accepted" || status === "completed" || status === "ready" || status === "served"
        ? "acknowledged"
        : String(call.status ?? "open");
    return {
      ...call,
      status: normalized,
      items: parseCallItems(call.items),
      call_type: parseWaiterCallType(call.call_type),
    };
  });

  return { restaurant, waiterCalls };
}

export async function loadShiftNotes(restaurantId: string) {
  if (!restaurantId) return [] as ShiftNote[];
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("shift_notes")
    .select(
      "id, restaurant_id, title, body, author_email, author_role, created_at, is_active",
    )
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) return [] as ShiftNote[];
  return (data ?? []).map((row) => toShiftNote(row as Record<string, unknown>));
}

export async function loadAdminBranding() {
  await requireAdminUser();
  const restaurant = await getActiveRestaurant();
  return { restaurant };
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function saveRestaurantBranding(formData: FormData) {
  const access = await requireTenantRestaurant();
  if (!access.user) return { error: "Unauthorized." };
  if (access.staffRole !== "owner") {
    return { error: "Only the restaurant owner can change branding." };
  }
  const restaurant = access.restaurant;
  if (!restaurant) {
    return { error: "No restaurant found in Supabase." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Restaurant name is required." };
  }

  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugifyRestaurant(slugInput || name);
  if (!slug) {
    return { error: "Slug must contain at least one Latin letter or number." };
  }

  const primary_color = normalizeHex(
    String(formData.get("primary_color") ?? ""),
    DEFAULT_BRAND.primary_color,
  );
  const secondary_color = normalizeHex(
    String(formData.get("secondary_color") ?? ""),
    DEFAULT_BRAND.secondary_color,
  );
  const bg_color = normalizeHex(
    String(formData.get("bg_color") ?? ""),
    DEFAULT_BRAND.bg_color,
  );
  const fontRaw = String(formData.get("font") ?? DEFAULT_BRAND.font);
  const font = BRAND_FONTS.some((item) => item.id === fontRaw)
    ? fontRaw
    : DEFAULT_BRAND.font;

  const supabase = createSupabaseAdminClient();
  const { data: slugTaken } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .neq("id", restaurant.id)
    .maybeSingle();

  if (slugTaken) {
    return { error: "That slug is already used by another restaurant." };
  }

  let logoUrl = restaurantLogo(restaurant);
  const file = formData.get("logo") as File | null;
  if (file && file.size > 0) {
    if (file.size > MAX_LOGO_BYTES) {
      return { error: "Logo must be 2 MB or smaller." };
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
    const ext = safeName.includes(".")
      ? safeName.slice(safeName.lastIndexOf(".") + 1).toLowerCase()
      : "png";
    const path = `${restaurant.id}/${Date.now()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(path, bytes, {
        contentType: file.type || "image/png",
        upsert: true,
      });
    if (uploadError) {
      return {
        error: `Logo upload failed (${uploadError.message}). Run supabase/restaurant-branding.sql to create the branding bucket, or paste a logo URL instead.`,
      };
    }
    logoUrl = supabase.storage.from("branding").getPublicUrl(path).data
      .publicUrl;
  } else {
    const pasted = String(formData.get("logo_url") ?? "").trim();
    if (pasted) logoUrl = pasted;
  }

  const googleRaw = String(
    formData.get("google_maps_review_url") ??
      formData.get("google_review_url") ??
      "",
  ).trim();
  let google_review_url: string | null = null;
  if (googleRaw) {
    try {
      const parsed = new URL(googleRaw);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { error: "Google Review URL must start with http:// or https://." };
      }
      google_review_url = parsed.toString();
    } catch {
      return { error: "Enter a valid Google Review URL." };
    }
  }

  const service_fee_percent = Number(formData.get("service_fee_percent"));
  const feePercent = Number.isFinite(service_fee_percent)
    ? Math.min(100, Math.max(0, service_fee_percent))
    : 0;

  const payload = {
    name,
    slug,
    logo: logoUrl,
    logo_url: logoUrl,
    primary_color,
    secondary_color,
    bg_color,
    font,
    google_review_url,
    google_maps_review_url: google_review_url,
    service_fee_percent: feePercent,
  };

  const { error } = await supabase
    .from("restaurants")
    .update(payload)
    .eq("id", restaurant.id);

  if (error) {
    const message = error.message.toLowerCase();
    const missingColumn =
      (message.includes("column") || message.includes("schema cache")) &&
      (message.includes("google_review_url") ||
        message.includes("google_maps_review_url") ||
        message.includes("service_fee_percent"));
    if (missingColumn) {
      const {
        google_review_url: unusedReviewUrl,
        google_maps_review_url: unusedMapsUrl,
        service_fee_percent: unusedFee,
        ...withoutReview
      } = payload;
      void unusedReviewUrl;
      void unusedMapsUrl;
      void unusedFee;
      const retry = await supabase
        .from("restaurants")
        .update(withoutReview)
        .eq("id", restaurant.id);
      if (retry.error) return { error: retry.error.message };
    } else {
      return { error: error.message };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/tables");
  revalidatePath("/menu", "layout");
  revalidateTag(TENANT_CACHE_TAG, "max");
  return { error: null };
}
