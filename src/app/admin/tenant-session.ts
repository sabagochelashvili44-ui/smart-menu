"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bindTenantSession, clearTenantSession } from "@/lib/tenant";

export async function bindManagerTenant(preferredSlug?: string | null) {
  return bindTenantSession(preferredSlug);
}

export async function clearManagerTenant() {
  await clearTenantSession();
}

export async function signOutAdminSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await clearTenantSession();
}
