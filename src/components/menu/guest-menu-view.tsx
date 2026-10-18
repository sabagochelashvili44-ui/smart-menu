import { BrandTheme } from "@/components/brand-theme";
import { RestaurantMenu } from "@/components/menu/restaurant-menu";
import { SuspendedMenuNotice } from "@/components/menu/suspended-menu-notice";
import { loadGuestMenu } from "@/lib/load-guest-menu";
import { isSubscriptionSuspended } from "@/lib/restaurant-brand";
import { notFound } from "next/navigation";

export async function GuestMenuView({
  restaurantSlug,
  tableId,
}: {
  restaurantSlug: string;
  tableId?: string;
}) {
  const menu = await loadGuestMenu(restaurantSlug, tableId);
  if (!menu) notFound();

  if (isSubscriptionSuspended(menu.restaurant.subscription_status)) {
    return (
      <BrandTheme brand={menu.restaurant}>
        <SuspendedMenuNotice restaurantName={menu.restaurant.name} />
      </BrandTheme>
    );
  }

  return (
    <BrandTheme brand={menu.restaurant}>
      <RestaurantMenu
        restaurant={menu.restaurant}
        table={menu.table}
        categories={menu.categories}
        dishes={menu.dishes}
      />
    </BrandTheme>
  );
}
