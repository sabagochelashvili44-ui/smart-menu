import { loadAdminMenu } from "@/app/admin/actions";
import { AdminEmptyRestaurant } from "@/components/admin/admin-empty-restaurant";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { MenuManager } from "@/components/admin/menu-manager";

export default async function AdminMenuPage() {
  const { restaurant, categories, dishes } = await loadAdminMenu();

  return (
    <section className="space-y-4">
      <AdminPageIntro titleKey="menuManager" subtitleKey="menuSubtitle" />
      {restaurant ? (
        <MenuManager
          restaurantName={restaurant.name}
          categories={categories}
          dishes={dishes}
        />
      ) : (
        <AdminEmptyRestaurant />
      )}
    </section>
  );
}
