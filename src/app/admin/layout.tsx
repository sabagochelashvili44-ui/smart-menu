import { AdminLocaleProvider } from "@/components/admin/admin-locale";
import { AdminShell } from "@/components/admin/admin-shell";
import { BrandTheme } from "@/components/brand-theme";
import { restaurantLogo } from "@/lib/restaurant-brand";
import {
  homePathForRole,
  isSuperAdminPath,
  pathAllowedForRole,
} from "@/lib/staff-role";
import { getAdminAccessContext } from "@/lib/tenant";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function enforceAdminRoute({
  pathname,
  isSuperAdmin,
  impersonating,
  staffRole,
}: {
  pathname: string;
  isSuperAdmin: boolean;
  impersonating: boolean;
  staffRole: Parameters<typeof pathAllowedForRole>[1] | null;
}) {
  const onSuperAdminPage = isSuperAdminPath(pathname);
  if (!isSuperAdmin && onSuperAdminPage) {
    redirect(homePathForRole(staffRole));
  }
  if (isSuperAdmin && !impersonating && !onSuperAdminPage) {
    redirect("/admin/super-admin");
  }
  if (onSuperAdminPage || !staffRole) return onSuperAdminPage;
  if (!pathAllowedForRole(pathname, staffRole)) {
    redirect(homePathForRole(staffRole));
  }
  return onSuperAdminPage;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    isSuperAdmin,
    viewingAs,
    restaurant,
    staffRole,
  } = await getAdminAccessContext();

  if (!user) {
    redirect("/login");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  const impersonating = Boolean(isSuperAdmin && viewingAs);
  const onSuperAdminPage = enforceAdminRoute({
    pathname,
    isSuperAdmin,
    impersonating,
    staffRole,
  });

  const showRestaurantTabs = Boolean(staffRole) && !onSuperAdminPage;
  const showSuperAdmin = isSuperAdmin && !impersonating;
  const logo = restaurant && showRestaurantTabs ? restaurantLogo(restaurant) : null;

  return (
    <BrandTheme brand={showRestaurantTabs ? restaurant : null}>
      <AdminLocaleProvider>
        <AdminShell
          showSuperAdmin={showSuperAdmin}
          showRestaurantTabs={showRestaurantTabs}
          staffRole={staffRole}
          restaurantName={showRestaurantTabs ? restaurant?.name ?? null : null}
          restaurantLogo={logo}
          viewingAsName={impersonating && !onSuperAdminPage ? viewingAs?.name ?? null : null}
        >
          {children}
        </AdminShell>
      </AdminLocaleProvider>
    </BrandTheme>
  );
}
