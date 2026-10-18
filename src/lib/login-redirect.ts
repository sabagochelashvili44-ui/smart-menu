import { parseSuperAdminEmails } from "@/lib/super-admin-shared";

export function safeAdminPath(path: string | null | undefined) {
  const next = path?.trim() ?? "";
  if (!next.startsWith("/admin") || next.startsWith("//")) return null;
  return next.split("?")[0] || "/admin";
}

export function adminLandingPath(
  email: string | null | undefined,
  next?: string | null,
) {
  const fromQuery = safeAdminPath(next);
  const normalized = email?.trim().toLowerCase() ?? "";
  const isListedSuperAdmin =
    Boolean(normalized) && parseSuperAdminEmails().includes(normalized);
  if (fromQuery) {
    if (
      (fromQuery === "/admin/super-admin" ||
        fromQuery.startsWith("/admin/super-admin/")) &&
      !isListedSuperAdmin
    ) {
      return "/admin";
    }
    return fromQuery;
  }
  if (isListedSuperAdmin) {
    return "/admin/super-admin";
  }
  return "/admin";
}

export function hardRedirectToAdmin(url: string) {
  window.location.href = url || "/admin";
}
