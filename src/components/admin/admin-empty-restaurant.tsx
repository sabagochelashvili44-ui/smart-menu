import { AdminEmptyRestaurant as AdminEmptyRestaurantMessage } from "@/components/admin/admin-page-intro";
import { requireTenantRestaurant } from "@/lib/tenant";
import { redirect } from "next/navigation";

export async function AdminEmptyRestaurant() {
  const ctx = await requireTenantRestaurant();
  if (!ctx.user) {
    redirect("/login");
  }
  if (ctx.isSuperAdmin && !ctx.viewingAs) {
    redirect("/admin/super-admin");
  }
  return <AdminEmptyRestaurantMessage />;
}
