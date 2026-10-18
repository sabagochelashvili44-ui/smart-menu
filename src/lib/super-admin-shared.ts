export type SubscriptionStatus = "active" | "trial" | "suspended";

export const SUPER_ADMIN_FALLBACK_EMAILS = [
  "sabagochelashvili7@gmail.com",
];

export function parseSuperAdminEmails() {
  const fromEnv = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...SUPER_ADMIN_FALLBACK_EMAILS, ...fromEnv])];
}

export function userLooksLikeSuperAdmin(user: {
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const email = user.email?.trim().toLowerCase() ?? "";
  if (email && parseSuperAdminEmails().includes(email)) {
    return true;
  }
  const appRole = String(user.app_metadata?.role ?? "");
  const userRole = String(user.user_metadata?.role ?? "");
  return appRole === "super_admin" || userRole === "super_admin";
}

export function userHasSuperAdminClaim(user: {
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  return userLooksLikeSuperAdmin(user);
}
