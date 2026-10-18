export type StaffRole = "owner" | "manager" | "waiter";

export const STAFF_ROLES: StaffRole[] = ["owner", "manager", "waiter"];

const ROLE_PATHS: Record<StaffRole, string[]> = {
  waiter: ["/admin/kitchen", "/admin/tables"],
  manager: ["/admin", "/admin/menu", "/admin/tables", "/admin/kitchen"],
  owner: [
    "/admin",
    "/admin/menu",
    "/admin/tables",
    "/admin/kitchen",
    "/admin/analytics",
    "/admin/settings",
    "/admin/staff",
  ],
};

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return STAFF_ROLES.includes(value as StaffRole);
}

export function normalizeStaffEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function homePathForRole(role: StaffRole | null | undefined) {
  return role === "waiter" ? "/admin/kitchen" : "/admin";
}

function normalizeAdminPath(pathname: string) {
  const path = (pathname.split("?")[0] || "/admin").replace(/\/+$/, "") || "/admin";
  if (path === "/admin/overview") return "/admin";
  return path;
}

export function isSuperAdminPath(pathname: string) {
  const path = normalizeAdminPath(pathname);
  return path === "/admin/super-admin" || path.startsWith("/admin/super-admin/");
}

export function pathAllowedForRole(pathname: string, role: StaffRole) {
  const path = normalizeAdminPath(pathname);
  if (path === "/admin/super-admin" || path.startsWith("/admin/super-admin/")) {
    return false;
  }
  return ROLE_PATHS[role].some((allowed) =>
    allowed === "/admin"
      ? path === "/admin"
      : path === allowed || path.startsWith(`${allowed}/`),
  );
}
