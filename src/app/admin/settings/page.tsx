import { loadAdminBranding } from "@/app/admin/actions";
import { AdminEmptyRestaurant } from "@/components/admin/admin-empty-restaurant";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { BrandingSettings } from "@/components/admin/branding-settings";

export default async function AdminSettingsPage() {
  const { restaurant } = await loadAdminBranding();

  return (
    <section className="space-y-4">
      <AdminPageIntro titleKey="settings" subtitleKey="settingsSubtitle" />
      {restaurant ? (
        <BrandingSettings restaurant={restaurant} />
      ) : (
        <AdminEmptyRestaurant />
      )}
    </section>
  );
}
