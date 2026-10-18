"use server";

import { revalidatePath } from "next/cache";
import {
  DEFAULT_BRAND,
  normalizeHex,
  slugifyRestaurant,
} from "@/lib/restaurant-brand";
import { loadSuperAdminNetwork } from "@/lib/super-admin-network";
import { requireSuperAdmin, type SubscriptionStatus } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { setSuperAdminViewAs } from "@/lib/tenant";

export type { SuperAdminKpis, SuperAdminRestaurant } from "@/lib/super-admin-network";

const DEFAULT_CATEGORIES = [
  "Cold Starters",
  "Salads",
  "Soups",
  "Khachapuri",
  "Main Dishes",
  "Drinks",
];

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function asStatus(value: string): SubscriptionStatus {
  if (value === "active" || value === "trial" || value === "suspended") {
    return value;
  }
  return "trial";
}

async function uploadLogo(
  restaurantId: string,
  file: File | null,
  fallback: string | null,
  pastedUrl: string,
) {
  if (file && file.size > 0) {
    if (file.size > MAX_LOGO_BYTES) {
      return { error: "Logo must be 2 MB or smaller.", url: fallback };
    }
    const supabase = createSupabaseAdminClient();
    const ext = (file.name.split(".").pop() ?? "png")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const path = `${restaurantId}/${Date.now()}.${ext || "png"}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from("branding").upload(path, bytes, {
      contentType: file.type || "image/png",
      upsert: true,
    });
    if (error) {
      return {
        error: `Logo upload failed (${error.message}).`,
        url: fallback,
      };
    }
    return {
      error: null,
      url: supabase.storage.from("branding").getPublicUrl(path).data.publicUrl,
    };
  }
  const pasted = pastedUrl.trim();
  return { error: null, url: pasted || fallback };
}

function parseTenantFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugifyRestaurant(
    String(formData.get("slug") ?? "").trim() || name,
  );
  const manager_email = String(formData.get("manager_email") ?? "")
    .trim()
    .toLowerCase();
  const subscription_fee = Number(formData.get("subscription_fee"));
  const subscription_status = asStatus(
    String(formData.get("subscription_status") ?? "trial"),
  );
  const validRaw = String(formData.get("valid_until") ?? "").trim();
  const valid_until = validRaw ? new Date(validRaw).toISOString() : null;
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
  const feeRaw = Number(formData.get("service_fee_percent"));
  const service_fee_percent = Number.isFinite(feeRaw)
    ? Math.min(100, Math.max(0, feeRaw))
    : 0;
  const googleRaw = String(
    formData.get("google_maps_review_url") ??
      formData.get("google_review_url") ??
      "",
  ).trim();
  let google_maps_review_url: string | null = null;
  if (googleRaw) {
    try {
      const parsed = new URL(googleRaw);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        google_maps_review_url = parsed.toString();
      }
    } catch {
      google_maps_review_url = null;
    }
  }
  return {
    name,
    slug,
    manager_email: manager_email || null,
    subscription_fee: Number.isFinite(subscription_fee) ? subscription_fee : 0,
    service_fee_percent,
    google_maps_review_url,
    google_review_url: google_maps_review_url,
    subscription_status,
    valid_until,
    primary_color,
    secondary_color,
    bg_color,
  };
}

export async function loadSuperAdminPanel() {
  return loadSuperAdminNetwork();
}

export async function createSuperAdminRestaurant(formData: FormData) {
  await requireSuperAdmin();
  const fields = parseTenantFields(formData);
  if (!fields.name) return { error: "Restaurant name is required." };
  if (!fields.slug) {
    return { error: "Slug must contain at least one Latin letter or number." };
  }

  const supabase = createSupabaseAdminClient();
  const { data: taken } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", fields.slug)
    .maybeSingle();
  if (taken) return { error: "That slug is already used." };

  const insertPayload = {
    name: fields.name,
    slug: fields.slug,
    manager_email: fields.manager_email,
    subscription_fee: fields.subscription_fee,
    subscription_status: fields.subscription_status,
    valid_until: fields.valid_until,
    primary_color: fields.primary_color,
    secondary_color: fields.secondary_color,
    bg_color: fields.bg_color,
    font: DEFAULT_BRAND.font,
    service_fee_percent: fields.service_fee_percent,
    google_maps_review_url: fields.google_maps_review_url,
    google_review_url: fields.google_review_url,
  };
  let { data: created, error: insertError } = await supabase
    .from("restaurants")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  if (insertError && !created) {
    const message = insertError.message ?? "";
    if (
      message.includes("service_fee_percent") ||
      message.includes("google_maps_review_url") ||
      message.includes("google_review_url")
    ) {
      const retry = await supabase
        .from("restaurants")
        .insert({
          name: fields.name,
          slug: fields.slug,
          manager_email: fields.manager_email,
          subscription_fee: fields.subscription_fee,
          subscription_status: fields.subscription_status,
          valid_until: fields.valid_until,
          primary_color: fields.primary_color,
          secondary_color: fields.secondary_color,
          bg_color: fields.bg_color,
          font: DEFAULT_BRAND.font,
        })
        .select("id")
        .maybeSingle();
      created = retry.data;
      insertError = retry.error;
    }
  }

  if (insertError || !created) {
    return { error: insertError?.message ?? "Could not create restaurant." };
  }

  const logo = await uploadLogo(
    created.id,
    formData.get("logo") as File | null,
    null,
    String(formData.get("logo_url") ?? ""),
  );
  if (logo.error) return { error: logo.error };
  if (logo.url) {
    await supabase
      .from("restaurants")
      .update({ logo: logo.url, logo_url: logo.url })
      .eq("id", created.id);
  }

  await supabase.from("tables").insert([
    { restaurant_id: created.id, table_number: "Table 1" },
    { restaurant_id: created.id, table_number: "Table 2" },
  ]);

  await supabase.from("categories").insert(
    DEFAULT_CATEGORIES.map((name, order_index) => ({
      restaurant_id: created.id,
      name,
      order_index,
    })),
  );

  revalidatePath("/admin/super-admin");
  revalidatePath("/menu", "layout");
  return {
    error: null,
    slug: fields.slug,
    name: fields.name,
    manager_email: fields.manager_email,
  };
}

export async function updateSuperAdminRestaurant(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing restaurant id." };

  const fields = parseTenantFields(formData);
  if (!fields.name) return { error: "Restaurant name is required." };
  if (!fields.slug) {
    return { error: "Slug must contain at least one Latin letter or number." };
  }

  const supabase = createSupabaseAdminClient();
  const { data: taken } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", fields.slug)
    .neq("id", id)
    .maybeSingle();
  if (taken) return { error: "That slug is already used." };

  const current = await supabase
    .from("restaurants")
    .select("logo, logo_url")
    .eq("id", id)
    .maybeSingle();

  const fallback =
    (current.data?.logo_url as string | null) ||
    (current.data?.logo as string | null) ||
    null;

  const logo = await uploadLogo(
    id,
    formData.get("logo") as File | null,
    fallback,
    String(formData.get("logo_url") ?? ""),
  );
  if (logo.error) return { error: logo.error };

  const updatePayload = {
    name: fields.name,
    slug: fields.slug,
    manager_email: fields.manager_email,
    subscription_fee: fields.subscription_fee,
    subscription_status: fields.subscription_status,
    valid_until: fields.valid_until,
    primary_color: fields.primary_color,
    secondary_color: fields.secondary_color,
    bg_color: fields.bg_color,
    logo: logo.url,
    logo_url: logo.url,
    service_fee_percent: fields.service_fee_percent,
    google_maps_review_url: fields.google_maps_review_url,
    google_review_url: fields.google_review_url,
  };
  let { error } = await supabase
    .from("restaurants")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    const message = error.message ?? "";
    if (
      message.includes("service_fee_percent") ||
      message.includes("google_maps_review_url") ||
      message.includes("google_review_url")
    ) {
      const retry = await supabase
        .from("restaurants")
        .update({
          name: fields.name,
          slug: fields.slug,
          manager_email: fields.manager_email,
          subscription_fee: fields.subscription_fee,
          subscription_status: fields.subscription_status,
          valid_until: fields.valid_until,
          primary_color: fields.primary_color,
          secondary_color: fields.secondary_color,
          bg_color: fields.bg_color,
          logo: logo.url,
          logo_url: logo.url,
        })
        .eq("id", id);
      error = retry.error;
    }
  }

  if (error) return { error: error.message };

  revalidatePath("/admin/super-admin");
  revalidatePath("/menu", "layout");
  return { error: null };
}

export async function toggleSuperAdminSubscription(id: string) {
  await requireSuperAdmin();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("subscription_status")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return { error: error?.message ?? "Restaurant not found." };

  const next =
    data.subscription_status === "active" ? "suspended" : "active";

  const { error: updateError } = await supabase
    .from("restaurants")
    .update({ subscription_status: next })
    .eq("id", id);

  if (updateError) return { error: updateError.message };
  revalidatePath("/admin/super-admin");
  revalidatePath("/menu", "layout");
  return { error: null };
}

export async function deleteSuperAdminRestaurant(id: string) {
  await requireSuperAdmin();
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("restaurants").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/super-admin");
  revalidatePath("/menu", "layout");
  return { error: null };
}

export async function enterSuperAdminViewAs(restaurantId: string) {
  await requireSuperAdmin();
  return setSuperAdminViewAs(restaurantId);
}

export async function exitSuperAdminViewAs() {
  await requireSuperAdmin();
  await setSuperAdminViewAs(null);
}
