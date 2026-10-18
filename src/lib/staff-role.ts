import "server-only";

import { createSupabaseAdminClient, type AdminRestaurant } from "@/lib/supabaseAdmin";
import {
  isStaffRole,
  normalizeStaffEmail,
  type StaffRole,
} from "@/lib/staff-role-shared";

export type { StaffRole } from "@/lib/staff-role-shared";
export {
  homePathForRole,
  isStaffRole,
  isSuperAdminPath,
  normalizeStaffEmail,
  pathAllowedForRole,
} from "@/lib/staff-role-shared";

export async function lookupStaffRole(
  restaurantId: string,
  email: string,
): Promise<StaffRole | null> {
  const normalized = normalizeStaffEmail(email);
  if (!normalized || !restaurantId) return null;
  try {
    const supabase = createSupabaseAdminClient();
    let result = await supabase
      .from("restaurant_staff")
      .select("role, email, restaurant_id")
      .eq("restaurant_id", restaurantId)
      .limit(200);
    if (result.error) {
      result = await supabase
        .from("restaurant_staff")
        .select("role, email, restaurant_id")
        .limit(2000);
    }
    const { data } = result;
    const row = (data ?? []).find((item) => {
      const rec = item as { email?: string; restaurant_id?: string; role?: string };
      return (
        normalizeStaffEmail(rec.email) === normalized &&
        String(rec.restaurant_id ?? "") === restaurantId
      );
    }) as { role?: string } | undefined;
    return isStaffRole(row?.role) ? row.role : null;
  } catch {
    return null;
  }
}

export async function resolveStaffRole(options: {
  email?: string | null;
  restaurant: AdminRestaurant | null;
  isSuperAdmin: boolean;
  viewingAs: boolean;
}): Promise<StaffRole | null> {
  const { restaurant, isSuperAdmin, viewingAs } = options;
  if (!restaurant) return null;
  if (isSuperAdmin && viewingAs) return "owner";
  if (isSuperAdmin) return null;

  const email = normalizeStaffEmail(options.email);
  if (!email) return null;

  if (normalizeStaffEmail(restaurant.manager_email) === email) {
    return "owner";
  }

  return lookupStaffRole(restaurant.id, email);
}
