import { loadRestaurantAnalyticsContext, snapshotForWindow } from "@/lib/admin-analytics-load";
import {
  computeCategoryRevenueSplit,
  computeHourlyAcknowledgedOrders,
  countPendingCalls,
} from "@/lib/overview-ops";
import { tbilisiDayEnd, tbilisiDayStart } from "@/lib/restaurant-day";

export async function loadTodayOverview(restaurantId: string) {
  const from = tbilisiDayStart();
  const to = tbilisiDayEnd();
  const context = await loadRestaurantAnalyticsContext(restaurantId);
  const snapshot = snapshotForWindow(context, from, to);
  const hourly = computeHourlyAcknowledgedOrders(context.waiterCalls, from, to);
  const categories = computeCategoryRevenueSplit(
    context.waiterCalls,
    context.dishes,
    from,
    to,
  );

  return {
    ...snapshot,
    window: "today" as const,
    pendingCalls: countPendingCalls(context.waiterCalls),
    hourly,
    categories,
    topToday: snapshot.popularDishes.slice(0, 3).map((row) => ({
      id: row.id,
      name: row.name,
      qty: row.qty,
    })),
  };
}
