import { loadAdminMenu, loadKitchenOrders, loadShiftNotes } from "@/app/admin/actions";
import { AdminEmptyRestaurant } from "@/components/admin/admin-empty-restaurant";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { KitchenBoard } from "@/components/admin/kitchen-board";
import { ShiftBulletinBoard } from "@/components/admin/shift-bulletin-board";
import { parseServiceFeePercent } from "@/lib/service-fee";
import { requireTenantRestaurant } from "@/lib/tenant";

export default async function AdminKitchenPage() {
  const ctx = await requireTenantRestaurant();
  const [{ restaurant, waiterCalls }, menu] = await Promise.all([
    loadKitchenOrders(),
    loadAdminMenu().catch(() => ({ dishes: [] as Awaited<ReturnType<typeof loadAdminMenu>>["dishes"] })),
  ]);
  const activeRestaurant = restaurant ?? ctx.restaurant;
  const notes = activeRestaurant
    ? await loadShiftNotes(activeRestaurant.id)
    : [];
  const canCompose =
    ctx.staffRole === "owner" || ctx.staffRole === "manager";
  const dishes = (menu.dishes ?? [])
    .filter((dish) => dish.is_available !== false)
    .map((dish) => ({
      id: dish.id,
      name: dish.name,
      price: Number(dish.price) || 0,
    }));

  return (
    <section className="space-y-4">
      <AdminPageIntro titleKey="kitchenDisplay" subtitleKey="kitchenSubtitle" />
      {activeRestaurant ? (
        <>
          <ShiftBulletinBoard
            restaurantId={activeRestaurant.id}
            initialNotes={notes}
            canCompose={canCompose}
          />
          <KitchenBoard
            restaurantId={activeRestaurant.id}
            initialCalls={waiterCalls}
            dishes={dishes}
            serviceFeePercent={parseServiceFeePercent(
              activeRestaurant.service_fee_percent,
            )}
          />
        </>
      ) : (
        <AdminEmptyRestaurant />
      )}
    </section>
  );
}
