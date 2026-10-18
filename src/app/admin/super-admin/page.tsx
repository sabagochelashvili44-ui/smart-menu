import { loadSuperAdminNetwork } from "@/lib/super-admin-network";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { SuperAdminPanel } from "@/components/admin/super-admin-panel";
import { requireSuperAdmin } from "@/lib/super-admin";

export default async function SuperAdminPage() {
  await requireSuperAdmin();
  const { restaurants, kpis } = await loadSuperAdminNetwork();

  return (
    <section className="space-y-4">
      <AdminPageIntro titleKey="superAdmin" subtitleKey="superAdminSubtitle" />
      <SuperAdminPanel kpis={kpis} restaurants={restaurants} />
    </section>
  );
}
