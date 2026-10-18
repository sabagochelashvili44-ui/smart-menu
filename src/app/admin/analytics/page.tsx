import { getTenant } from "@/lib/tenant";
import { AdminEmptyRestaurant } from "@/components/admin/admin-empty-restaurant";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { AnalyticsBoard } from "@/components/admin/analytics-board";
import { Suspense } from "react";

export default async function AdminAnalyticsPage() {
  const restaurant = await getTenant();

  return (
    <section className="space-y-4">
      <AdminPageIntro titleKey="aiAnalytics" subtitleKey="analyticsSubtitle" />
      {restaurant ? (
        <Suspense
          fallback={
            <p className="text-muted-foreground text-sm">…</p>
          }
        >
          <AnalyticsBoard restaurantId={restaurant.id} />
        </Suspense>
      ) : (
        <AdminEmptyRestaurant />
      )}
    </section>
  );
}
