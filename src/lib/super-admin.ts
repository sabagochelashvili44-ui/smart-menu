import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { requireAdminUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { userHasSuperAdminClaim } from "@/lib/super-admin-shared";

export type { SubscriptionStatus } from "@/lib/super-admin-shared";
export {
  parseSuperAdminEmails,
  SUPER_ADMIN_FALLBACK_EMAILS,
  userHasSuperAdminClaim,
  userLooksLikeSuperAdmin,
} from "@/lib/super-admin-shared";

export const isSuperAdminUser = cache(async (user: User) => {
  if (userHasSuperAdminClaim(user)) {
    return true;
  }
  const email = user.email?.trim().toLowerCase() ?? "";
  if (!email) return false;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("super_admins")
    .select("email")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    return false;
  }
  return Boolean(data);
});

export async function requireSuperAdmin() {
  const user = await requireAdminUser();
  const allowed = await isSuperAdminUser(user);
  if (!allowed) {
    redirect("/admin");
  }
  return user;
}
