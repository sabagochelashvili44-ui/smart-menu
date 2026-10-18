import { loadAdminTables } from "@/app/admin/actions";
import { AdminEmptyRestaurant } from "@/components/admin/admin-empty-restaurant";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { QrTables } from "@/components/admin/qr-tables";
import { requireTenantRestaurant } from "@/lib/tenant";

export default async function AdminTablesPage() {
  const ctx = await requireTenantRestaurant();
  const { restaurant, tables } = await loadAdminTables();
  const activeRestaurant = restaurant ?? ctx.restaurant;

  return (
    <section className="space-y-4">
      <AdminPageIntro titleKey="tablesQr" subtitleKey="tablesSubtitle" />
      {activeRestaurant ? (
        <QrTables restaurant={activeRestaurant} tables={tables} />
      ) : (
        <AdminEmptyRestaurant />
      )}
    </section>
  );
}
