import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireSuperAdmin } from "@/lib/super-admin";
import type { SubscriptionStatus } from "@/lib/super-admin-shared";

export type SuperAdminRestaurant = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  bg_color: string | null;
  font: string | null;
  subscription_status: SubscriptionStatus;
  subscription_fee: number;
  valid_until: string | null;
  manager_email: string | null;
  service_fee_percent: number;
  google_maps_review_url: string | null;
  google_review_url: string | null;
  order_count: number;
};

export type SuperAdminKpis = {
  totalRestaurants: number;
  activeSubscribers: number;
  mrr: number;
  totalOrders: number;
};

const NETWORK_RESTAURANT_SELECT =
  "id, name, slug, logo, logo_url, primary_color, secondary_color, bg_color, font, subscription_status, subscription_fee, valid_until, manager_email, service_fee_percent, google_maps_review_url, google_review_url";
const NETWORK_RESTAURANT_SELECT_CORE =
  "id, name, slug, logo, logo_url, primary_color, secondary_color, bg_color, font, subscription_status, subscription_fee, valid_until, manager_email";

async function fetchRestaurantRows(
  supabase: { from: (table: string) => { select: (columns: string) => any } },
) {
  const full = await fetchAllRows(supabase, "restaurants", NETWORK_RESTAURANT_SELECT);
  if (full.ok) return full.rows;
  const core = await fetchAllRows(
    supabase,
    "restaurants",
    NETWORK_RESTAURANT_SELECT_CORE,
  );
  return core.rows;
}

async function fetchAllRows(
  supabase: { from: (table: string) => { select: (columns: string) => any } },
  table: string,
  columns: string,
) {
  const pageSize = 1000;
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; from < 50_000; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) return { ok: false as const, rows: [] as Record<string, unknown>[] };
    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return { ok: true as const, rows };
}

function mergeById(groups: Record<string, unknown>[][]) {
  const map = new Map<string, Record<string, unknown>>();
  for (const group of groups) {
    for (const row of group) {
      const id = String(row.id ?? "");
      if (id) map.set(id, row);
    }
  }
  return [...map.values()];
}

function asStatus(value: string): SubscriptionStatus {
  if (value === "active" || value === "trial" || value === "suspended") {
    return value;
  }
  return "trial";
}

function toTenant(
  row: Record<string, unknown>,
  orderCount = 0,
): SuperAdminRestaurant {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: row.slug ? String(row.slug) : null,
    logo: row.logo ? String(row.logo) : null,
    logo_url: row.logo_url ? String(row.logo_url) : null,
    primary_color: row.primary_color ? String(row.primary_color) : null,
    secondary_color: row.secondary_color ? String(row.secondary_color) : null,
    bg_color: row.bg_color ? String(row.bg_color) : null,
    font: row.font ? String(row.font) : null,
    subscription_status: asStatus(String(row.subscription_status ?? "trial")),
    subscription_fee: Number(row.subscription_fee) || 0,
    valid_until: row.valid_until ? String(row.valid_until) : null,
    manager_email: row.manager_email ? String(row.manager_email) : null,
    service_fee_percent: Number(row.service_fee_percent) || 0,
    google_maps_review_url: row.google_maps_review_url
      ? String(row.google_maps_review_url)
      : null,
    google_review_url: row.google_review_url
      ? String(row.google_review_url)
      : null,
    order_count: orderCount,
  };
}

/** Unique ticket ids per restaurant from waiter_calls and orders. */
function orderCountsByRestaurant(rows: Record<string, unknown>[]) {
  const byRestaurant = new Map<string, Set<string>>();
  for (const row of rows) {
    const restaurantId = String(row.restaurant_id ?? "");
    const id = String(row.id ?? "");
    if (!restaurantId || !id) continue;
    const ids = byRestaurant.get(restaurantId) ?? new Set<string>();
    ids.add(id);
    byRestaurant.set(restaurantId, ids);
  }
  const counts = new Map<string, number>();
  for (const [restaurantId, ids] of byRestaurant) {
    counts.set(restaurantId, ids.size);
  }
  return counts;
}

/**
 * Global SaaS metrics. Never reads getTenant() or restaurant_id from the admin layout.
 */
export async function loadSuperAdminNetwork() {
  await requireSuperAdmin();

  const sessionClient = await createSupabaseServerClient();
  const serviceClient = createSupabaseAdminClient();

  const [sessionRestaurants, serviceRestaurants, sessionCalls, serviceCalls, sessionOrders, serviceOrders] =
    await Promise.all([
      fetchRestaurantRows(sessionClient),
      fetchRestaurantRows(serviceClient),
      fetchAllRows(sessionClient, "waiter_calls", "id, restaurant_id").then(
        (result) => result.rows,
      ),
      fetchAllRows(serviceClient, "waiter_calls", "id, restaurant_id").then(
        (result) => result.rows,
      ),
      fetchAllRows(sessionClient, "orders", "id, restaurant_id").then(
        (result) => result.rows,
      ),
      fetchAllRows(serviceClient, "orders", "id, restaurant_id").then(
        (result) => result.rows,
      ),
    ]);

  const restaurantRows = mergeById([sessionRestaurants, serviceRestaurants]);
  const callCounts = orderCountsByRestaurant(
    mergeById([sessionCalls, serviceCalls]),
  );
  const orderTableCounts = orderCountsByRestaurant(
    mergeById([sessionOrders, serviceOrders]),
  );
  const restaurants = restaurantRows
    .map((row) => {
      const id = String(row.id ?? "");
      const orderCount =
        (callCounts.get(id) ?? 0) + (orderTableCounts.get(id) ?? 0);
      return toTenant(row, orderCount);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const active = restaurants.filter((row) => row.subscription_status === "active");
  const kpis: SuperAdminKpis = {
    totalRestaurants: restaurants.length,
    activeSubscribers: active.length,
    mrr: active.reduce((sum, row) => sum + row.subscription_fee, 0),
    totalOrders: restaurants.reduce((sum, row) => sum + row.order_count, 0),
  };

  return { restaurants, kpis };
}
