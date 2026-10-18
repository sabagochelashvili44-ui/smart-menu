import { AdminEmptyRestaurant } from "@/components/admin/admin-empty-restaurant";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { OverviewBoard } from "@/components/admin/overview-board";
import { loadTodayOverview } from "@/lib/admin-overview-load";
import { emptyOverviewSnapshot } from "@/lib/overview-types";
import { getTenant, requireTenantRestaurant } from "@/lib/tenant";
import { redirect } from "next/navigation";

export default async function AdminOverviewPage() {
  const ctx = await requireTenantRestaurant();
  if (ctx.isSuperAdmin && !ctx.viewingAs) {
    redirect("/admin/super-admin");
  }
  if (ctx.staffRole === "waiter") {
    redirect("/admin/kitchen");
  }

  const tenant = await getTenant();

  if (tenant?.id) {
    let initialData = emptyOverviewSnapshot();
    try {
      initialData = await loadTodayOverview(tenant.id);
    } catch {
      initialData = emptyOverviewSnapshot();
    }

    return (
      <section className="space-y-4">
        <AdminPageIntro
          titleKey="todaysOperations"
          subtitleKey="overviewSubtitle"
        />
        <OverviewBoard restaurantId={tenant.id} initialData={initialData} />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <AdminPageIntro
        titleKey="todaysOperations"
        subtitleKey="overviewSubtitle"
      />
      <AdminEmptyRestaurant />
    </section>
  );
}
