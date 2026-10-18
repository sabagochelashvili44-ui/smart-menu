import { loadRestaurantStaff } from "@/app/admin/staff/actions";
import { AdminEmptyRestaurant } from "@/components/admin/admin-empty-restaurant";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { StaffManager } from "@/components/admin/staff-manager";
import { requireTenantRestaurant } from "@/lib/tenant";
import { redirect } from "next/navigation";

export default async function AdminStaffPage() {
  const ctx = await requireTenantRestaurant();
  if (ctx.staffRole !== "owner") {
    redirect("/admin");
  }

  const { staff } = await loadRestaurantStaff();

  return (
    <section className="space-y-4">
      <AdminPageIntro titleKey="staffNav" subtitleKey="staffSubtitle" />
      {ctx.restaurant ? (
        <StaffManager
          staff={staff}
          restaurantId={ctx.restaurant.id}
          restaurantName={ctx.restaurant.name}
        />
      ) : (
        <AdminEmptyRestaurant />
      )}
    </section>
  );
}
