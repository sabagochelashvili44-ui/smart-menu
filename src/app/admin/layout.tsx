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
  const onSuperAdminPage = isSuperAdminPath(pathname);
  const impersonating = Boolean(isSuperAdmin && viewingAs);

  if (!isSuperAdmin && onSuperAdminPage) {
    redirect(homePathForRole(staffRole));
  }

  if (isSuperAdmin && !impersonating && !onSuperAdminPage) {
    redirect("/admin/super-admin");
  }

  if (!onSuperAdminPage && staffRole) {
    if (!pathAllowedForRole(pathname, staffRole)) {
      redirect(homePathForRole(staffRole));
    }
  }

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
