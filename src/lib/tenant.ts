import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import "server-only";
import { getSessionUser, createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSupabaseAdminClient,
  type AdminRestaurant,
} from "@/lib/supabaseAdmin";
import { isSuperAdminUser } from "@/lib/super-admin";
import { RESTAURANT_BRAND_SELECT } from "@/lib/restaurant-brand";
import {
  homePathForRole,
  resolveStaffRole,
  type StaffRole,
} from "@/lib/staff-role";
import {
  RESTAURANT_ID_RE,
  TENANT_COOKIE,
  VIEW_AS_COOKIE,
} from "@/lib/tenant-shared";

export {
  IMPERSONATE_RESTAURANT_QUERY,
  TENANT_COOKIE,
  VIEW_AS_COOKIE,
} from "@/lib/tenant-shared";
export const TENANT_CACHE_TAG = "admin-tenant-restaurants";

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function emailsForUser(user: User) {
  const metadata = user.user_metadata as { email?: string } | undefined;
  const fromIdentities = (user.identities ?? []).map((identity) => {
    const data = identity.identity_data as { email?: string } | undefined;
    return data?.email;
  });
  return [
    ...new Set(
      [user.email, metadata?.email, ...fromIdentities]
        .map((value) => normalizeEmail(value))
        .filter(Boolean),
    ),
  ];
}

async function loadRestaurantsByIds(ids: string[]) {
  const unique = [...new Set(ids.filter((id) => RESTAURANT_ID_RE.test(id)))];
  if (unique.length === 0) return [] as AdminRestaurant[];
  const supabase = createSupabaseAdminClient();
  const branded = await supabase
    .from("restaurants")
    .select(RESTAURANT_BRAND_SELECT)
    .in("id", unique);
  if (!branded.error && branded.data?.length) {
    return branded.data as AdminRestaurant[];
  }
  const minimal = await supabase
    .from("restaurants")
    .select("id, name, slug, logo, manager_email")
    .in("id", unique);
  return (minimal.data ?? []) as AdminRestaurant[];
}

function escapeIlikeExact(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function pickByManagerEmail(
  rows: AdminRestaurant[],
  email: string,
): AdminRestaurant | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return (
    rows.find(
      (row) => normalizeEmail(row.manager_email) === normalized,
    ) ?? null
  );
}

async function queryRestaurantsForEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [] as AdminRestaurant[];

  try {
    const supabase = createSupabaseAdminClient();
    const rpc = await supabase.rpc("restaurants_for_manager_email", {
      p_email: normalized,
    });
    if (!rpc.error && rpc.data) {
      const rows = (
        Array.isArray(rpc.data) ? rpc.data : [rpc.data]
      ) as AdminRestaurant[];
      const matched = rows.filter(
        (row) => normalizeEmail(row.manager_email) === normalized,
      );
      if (matched.length > 0) return matched;
    }

    const branded = await supabase
      .from("restaurants")
      .select(RESTAURANT_BRAND_SELECT)
      .ilike("manager_email", escapeIlikeExact(normalized));

    if (!branded.error) {
      const matched = ((branded.data ?? []) as AdminRestaurant[]).filter(
        (row) => normalizeEmail(row.manager_email) === normalized,
      );
      if (matched.length > 0) return matched;
    }

    const withEmail = await supabase
      .from("restaurants")
      .select("id, name, slug, logo, manager_email")
      .ilike("manager_email", escapeIlikeExact(normalized));

    if (!withEmail.error) {
      const matched = ((withEmail.data ?? []) as AdminRestaurant[]).filter(
        (row) => normalizeEmail(row.manager_email) === normalized,
      );
      if (matched.length > 0) return matched;
    }

    const scanned = await supabase
      .from("restaurants")
      .select(RESTAURANT_BRAND_SELECT)
      .limit(500);
    if (!scanned.error) {
      return ((scanned.data ?? []) as AdminRestaurant[]).filter(
        (row) => normalizeEmail(row.manager_email) === normalized,
      );
    }
  } catch {
    return [] as AdminRestaurant[];
  }

  return [] as AdminRestaurant[];
}

async function loadRestaurantsForEmail(email: string) {
  return queryRestaurantsForEmail(email);
}

function staffEmailMatches(
  rowEmail: string | null | undefined,
  normalized: string,
) {
  return normalizeEmail(rowEmail) === normalized;
}

function uniqueRestaurants(rows: AdminRestaurant[]) {
  const seen = new Set<string>();
  const out: AdminRestaurant[] = [];
  for (const row of rows) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function pickPreferredRestaurant(
  pool: AdminRestaurant[],
  options: { preferredId?: string | null; preferredSlug?: string | null },
) {
  if (pool.length === 0) return null;
  const preferredId = options.preferredId?.trim() ?? "";
  if (preferredId) {
    const byId = pool.find((row) => row.id === preferredId);
    if (byId) return byId;
  }
  const preferred = options.preferredSlug?.trim().toLowerCase();
  if (preferred) {
    const bySlug = pool.find(
      (row) => (row.slug ?? "").toLowerCase() === preferred,
    );
    if (bySlug) return bySlug;
  }
  return pool[0] ?? null;
}

async function queryRestaurantsForStaffEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [] as AdminRestaurant[];
  try {
    const supabase = createSupabaseAdminClient();
    let staff = await supabase
      .from("restaurant_staff")
      .select("restaurant_id, email")
      .ilike("email", escapeIlikeExact(normalized));

    const rows = (staff.data ?? []) as {
      restaurant_id?: string;
      email?: string;
    }[];
    let matched = rows.filter((row) => staffEmailMatches(row.email, normalized));

    if (staff.error || matched.length === 0) {
      const scanned = await supabase
        .from("restaurant_staff")
        .select("restaurant_id, email")
        .limit(2000);
      matched = ((scanned.data ?? []) as typeof rows).filter((row) =>
        staffEmailMatches(row.email, normalized),
      );
    }

    return loadRestaurantsByIds(
      matched.map((row) => String(row.restaurant_id ?? "")),
    );
  } catch {
    return [] as AdminRestaurant[];
  }
}

async function queryRestaurantsForLoginEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [] as AdminRestaurant[];
  try {
    const supabase = createSupabaseAdminClient();
    const rpc = await supabase.rpc("restaurants_for_login_email", {
      p_email: normalized,
    });
    if (!rpc.error && rpc.data) {
      const rows = uniqueRestaurants(
        (Array.isArray(rpc.data) ? rpc.data : [rpc.data]) as AdminRestaurant[],
      );
      if (rows.length > 0) return rows;
    }
  } catch {
    // Fall through to table queries.
  }

  const staffed = await queryRestaurantsForStaffEmail(normalized);
  if (staffed.length > 0) return staffed;
  return loadRestaurantsForEmail(normalized);
}

/** Session-scoped lookup: JWT user + restaurants visible to that user (RLS). */
export async function resolveRestaurantFromSession() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const emails = emailsForUser(user);
    const { data, error } = await supabase
      .from("restaurants")
      .select(RESTAURANT_BRAND_SELECT)
      .limit(500);

    let rows = error ? [] : ((data ?? []) as AdminRestaurant[]);
    if (error) {
      const retry = await supabase
        .from("restaurants")
        .select("id, name, slug, logo, manager_email, subscription_status")
        .limit(500);
      rows = (retry.data ?? []) as AdminRestaurant[];
    }

    for (const email of emails) {
      const managed = pickByManagerEmail(rows, email);
      if (managed) return managed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Staff row first, then restaurants.manager_email, then session-visible rows. */
export async function resolveRestaurantForUser(
  user: User,
  preferredSlug?: string | null,
) {
  try {
    const emails = emailsForUser(user);
    const preferredId = await readTenantCookieId();
    const pool: AdminRestaurant[] = [];

    for (const email of emails) {
      pool.push(...(await queryRestaurantsForLoginEmail(email)));
      if (pool.length > 0) break;
    }

    let unique = uniqueRestaurants(pool);
    if (unique.length === 0) {
      const sessionRestaurant = await resolveRestaurantFromSession();
      if (sessionRestaurant) unique = [sessionRestaurant];
    }

    return pickPreferredRestaurant(unique, { preferredId, preferredSlug });
  } catch {
    return null;
  }
}

export async function getFirstActiveRestaurant() {
  try {
    const supabase = createSupabaseAdminClient();
    const active = await supabase
      .from("restaurants")
      .select(RESTAURANT_BRAND_SELECT)
      .neq("subscription_status", "suspended")
      .order("created_at", { ascending: true })
      .limit(1);

    if (!active.error && active.data?.[0]) {
      return active.data[0] as AdminRestaurant;
    }

    const fallback = await supabase
      .from("restaurants")
      .select(RESTAURANT_BRAND_SELECT)
      .order("created_at", { ascending: true })
      .limit(1);

    if (!fallback.error && fallback.data?.[0]) {
      return fallback.data[0] as AdminRestaurant;
    }

    const minimal = await supabase
      .from("restaurants")
      .select("id, name, slug, logo, manager_email")
      .order("created_at", { ascending: true })
      .limit(1);

    return (minimal.data?.[0] as AdminRestaurant | undefined) ?? null;
  } catch {
    return null;
  }
}

export const requireTenantRestaurant = cache(async () => {
  try {
    const user = await getSessionUser();
    if (!user) {
      return {
        user: null,
        restaurant: null,
        isSuperAdmin: false as const,
        isRestaurantManager: false as const,
        viewingAs: null,
        staffRole: null,
      };
    }

    let isSuperAdmin = false;
    try {
      isSuperAdmin = await isSuperAdminUser(user);
    } catch {
      isSuperAdmin = false;
    }

    let restaurant: AdminRestaurant | null = null;
    let viewingAs: AdminRestaurant | null = null;

    if (isSuperAdmin) {
      const viewAsId = await readViewAsRestaurantId();
      if (viewAsId) {
        viewingAs = await loadRestaurantById(viewAsId);
      }
      restaurant = viewingAs;
    } else {
      try {
        restaurant = await resolveRestaurantForUser(user);
      } catch {
        restaurant = null;
      }

      if (!restaurant) {
        try {
          restaurant = await resolveRestaurantFromSession();
        } catch {
          restaurant = null;
        }
      }
    }

    const isRestaurantManager = Boolean(restaurant) && !isSuperAdmin;

    const staffRole = restaurant
      ? await resolveStaffRole({
          email: user.email,
          restaurant,
          isSuperAdmin,
          viewingAs: Boolean(viewingAs),
        })
      : null;

    return {
      user,
      restaurant,
      isSuperAdmin,
      isRestaurantManager,
      viewingAs,
      staffRole,
    };
  } catch {
    return {
      user: null,
      restaurant: null,
      isSuperAdmin: false as const,
      isRestaurantManager: false as const,
      viewingAs: null,
      staffRole: null,
    };
  }
});

export async function getTenant() {
  const ctx = await requireTenantRestaurant();
  return ctx.restaurant;
}

/** Layout/pages: same cached tenant context after staff-then-owner resolution. */
export const getAdminAccessContext = requireTenantRestaurant;

export const getActiveRestaurant = cache(async () => {
  return getTenant();
});

async function writeTenantCookie(restaurantId: string | null) {
  const cookieStore = await cookies();
  if (!restaurantId) {
    cookieStore.delete(TENANT_COOKIE);
    return;
  }
  cookieStore.set(TENANT_COOKIE, restaurantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function bindTenantSession(preferredSlug?: string | null) {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: "Not signed in.",
      redirectTo: "/login" as const,
      isSuperAdmin: false,
      restaurantId: null as string | null,
    };
  }

  const [matched, isSuperAdmin] = await Promise.all([
    resolveRestaurantForUser(user, preferredSlug),
    isSuperAdminUser(user),
  ]);

  await writeTenantCookie(matched?.id ?? null);

  const staffRole = matched
    ? await resolveStaffRole({
        email: user.email,
        restaurant: matched,
        isSuperAdmin,
        viewingAs: false,
      })
    : null;

  return {
    error: null as string | null,
    isSuperAdmin,
    restaurantId: matched?.id ?? null,
    redirectTo: (isSuperAdmin
      ? "/admin/super-admin"
      : homePathForRole(staffRole)) as string,
  };
}

export async function requireTenantApi(allowed?: StaffRole[]) {
  const ctx = await requireTenantRestaurant();
  if (!ctx.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!ctx.restaurant) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "No restaurant is linked to this account." },
        { status: 403 },
      ),
    };
  }
  if (allowed && (!ctx.staffRole || !allowed.includes(ctx.staffRole))) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }
  return {
    ok: true as const,
    user: ctx.user,
    restaurant: ctx.restaurant,
    isSuperAdmin: ctx.isSuperAdmin,
    staffRole: ctx.staffRole,
  };
}

export async function clearTenantSession() {
  await writeTenantCookie(null);
  await writeViewAsCookie(null);
}

async function loadRestaurantById(id: string) {
  if (!RESTAURANT_ID_RE.test(id)) return null;
  try {
    const supabase = createSupabaseAdminClient();
    const branded = await supabase
      .from("restaurants")
      .select(RESTAURANT_BRAND_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (!branded.error && branded.data) {
      return branded.data as AdminRestaurant;
    }
    const fallback = await supabase
      .from("restaurants")
      .select(
        "id, name, slug, logo, logo_url, primary_color, secondary_color, bg_color, font, subscription_status, manager_email",
      )
      .eq("id", id)
      .maybeSingle();
    if (fallback.error || !fallback.data) return null;
    return fallback.data as AdminRestaurant;
  } catch {
    return null;
  }
}

async function readTenantCookieId() {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(TENANT_COOKIE)?.value?.trim() ?? "";
    return RESTAURANT_ID_RE.test(value) ? value : null;
  } catch {
    return null;
  }
}

async function readViewAsRestaurantId() {
  const cookieStore = await cookies();
  const value = cookieStore.get(VIEW_AS_COOKIE)?.value?.trim() ?? "";
  return RESTAURANT_ID_RE.test(value) ? value : null;
}

async function writeViewAsCookie(restaurantId: string | null) {
  const cookieStore = await cookies();
  if (!restaurantId) {
    cookieStore.delete(VIEW_AS_COOKIE);
    return;
  }
  cookieStore.set(VIEW_AS_COOKIE, restaurantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function setSuperAdminViewAs(restaurantId: string | null) {
  const user = await getSessionUser();
  if (!user || !(await isSuperAdminUser(user))) {
    return { error: "Forbidden." };
  }
  if (!restaurantId) {
    await writeViewAsCookie(null);
    return { error: null as string | null };
  }
  const restaurant = await loadRestaurantById(restaurantId);
  if (!restaurant) return { error: "Restaurant not found." };
  await writeViewAsCookie(restaurant.id);
  return { error: null as string | null };
}
