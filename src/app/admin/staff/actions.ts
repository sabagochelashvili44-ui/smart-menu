"use server";

import { revalidatePath } from "next/cache";
import {
  isStaffRole,
  normalizeStaffEmail,
  type StaffRole,
} from "@/lib/staff-role-shared";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireTenantRestaurant } from "@/lib/tenant";

export type StaffMember = {
  id: string;
  email: string;
  role: StaffRole;
  created_at: string | null;
  legacy: boolean;
};

async function requireOwner() {
  const ctx = await requireTenantRestaurant();
  if (!ctx.user || !ctx.restaurant) {
    return { ok: false as const, error: "Unauthorized.", restaurant: null, email: "" };
  }
  if (ctx.staffRole !== "owner") {
    return {
      ok: false as const,
      error: "Only the restaurant owner can manage staff.",
      restaurant: null,
      email: "",
    };
  }
  return {
    ok: true as const,
    error: null as string | null,
    restaurant: ctx.restaurant,
    email: normalizeStaffEmail(ctx.user.email),
  };
}

export async function loadRestaurantStaff() {
  const access = await requireOwner();
  if (!access.ok || !access.restaurant) {
    return { error: access.error, staff: [] as StaffMember[] };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("restaurant_staff")
    .select("id, email, role, created_at")
    .eq("restaurant_id", access.restaurant.id)
    .order("created_at", { ascending: true });

  if (error) {
    return { error: error.message, staff: [] as StaffMember[] };
  }

  const staff: StaffMember[] = ((data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      id: String(row.id),
      email: normalizeStaffEmail(String(row.email ?? "")),
      role: isStaffRole(String(row.role)) ? (row.role as StaffRole) : "waiter",
      created_at: row.created_at ? String(row.created_at) : null,
      legacy: false,
    }),
  );

  const ownerEmail = normalizeStaffEmail(access.restaurant.manager_email);
  if (
    ownerEmail &&
    !staff.some((row) => row.email === ownerEmail && row.role === "owner")
  ) {
    staff.unshift({
      id: `legacy:${ownerEmail}`,
      email: ownerEmail,
      role: "owner",
      created_at: null,
      legacy: true,
    });
  }

  return { error: null as string | null, staff };
}

export async function saveRestaurantStaff(formData: FormData) {
  const access = await requireOwner();
  if (!access.ok || !access.restaurant) return { error: access.error };

  const id = String(formData.get("id") ?? "").trim();
  const email = normalizeStaffEmail(String(formData.get("email") ?? ""));
  const roleRaw = String(formData.get("role") ?? "waiter");
  const role: StaffRole = roleRaw === "manager" ? "manager" : "waiter";

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email." };
  }

  const supabase = createSupabaseAdminClient();

  const existing = await supabase
    .from("restaurant_staff")
    .select("id")
    .eq("restaurant_id", access.restaurant.id)
    .ilike("email", email)
    .maybeSingle();

  const targetId =
    id && !id.startsWith("legacy:") ? id : existing.data?.id ?? null;

  if (targetId) {
    const { error } = await supabase
      .from("restaurant_staff")
      .update({ email, role })
      .eq("id", targetId)
      .eq("restaurant_id", access.restaurant.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("restaurant_staff").insert({
      restaurant_id: access.restaurant.id,
      email,
      role,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/staff");
  return { error: null as string | null };
}

export async function deleteRestaurantStaff(id: string) {
  const access = await requireOwner();
  if (!access.ok || !access.restaurant) return { error: access.error };
  if (!id || id.startsWith("legacy:")) {
    return { error: "The owner cannot be removed from this page." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("restaurant_staff")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", access.restaurant.id);
  if (error) return { error: error.message };

  revalidatePath("/admin/staff");
  return { error: null as string | null };
}
