import {
  isAcknowledgedCall,
  isPendingCall,
  type AnalyticsDish,
  type WaiterCallMetric,
} from "@/lib/ai/analytics";
import { RESTAURANT_TZ, isTimestampInRange } from "@/lib/restaurant-day";

export type HourBucket = {
  hour: number;
  label: string;
  orders: number;
  isPeak: boolean;
};

export type CategoryShare = {
  category: string;
  revenue: number;
  percent: number;
};

function padHour(hour: number) {
  return String(hour).padStart(2, "0");
}

export function hourLabel(hour: number) {
  const next = (hour + 1) % 24;
  return `${padHour(hour)}:00–${padHour(next)}:00`;
}

export function tbilisiHour(iso: string) {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: RESTAURANT_TZ,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  return Number.parseInt(formatted, 10);
}

export function computeHourlyAcknowledgedOrders(
  calls: WaiterCallMetric[],
  from: Date,
  to: Date,
): HourBucket[] {
  const counts = Array.from({ length: 24 }, () => 0);

  for (const call of calls) {
    if (!isAcknowledgedCall(call.status)) continue;
    if (!call.items.length) continue;
    const stamp = call.acknowledged_at || call.created_at;
    if (!stamp || !isTimestampInRange(stamp, from, to)) continue;
    const hour = tbilisiHour(stamp);
    if (hour >= 0 && hour <= 23) counts[hour] += 1;
  }

  const peak = Math.max(0, ...counts);
  return counts
    .map((orders, hour) => ({
      hour,
      label: hourLabel(hour),
      orders,
      isPeak: peak > 0 && orders === peak,
    }))
    .filter((row) => row.orders > 0);
}

export function computeCategoryRevenueSplit(
  calls: WaiterCallMetric[],
  dishes: AnalyticsDish[],
  from: Date,
  to: Date,
): CategoryShare[] {
  const categoryByDishId = new Map(
    dishes.map((dish) => [dish.id, dish.category || dish.category_id || ""]),
  );
  const categoryByName = new Map(
    dishes.map((dish) => [dish.name, dish.category || dish.category_id || ""]),
  );

  const totals: Record<string, number> = {};
  let grand = 0;

  for (const call of calls) {
    if (!isAcknowledgedCall(call.status)) continue;
    const stamp = call.acknowledged_at || call.created_at;
    if (!isTimestampInRange(stamp, from, to)) continue;
    for (const item of call.items) {
      const amount = item.quantity * item.unit_price;
      if (amount <= 0) continue;
      const category =
        categoryByDishId.get(item.dish_id) ||
        categoryByName.get(item.name) ||
        "";
      const key = category || "__other__";
      totals[key] = (totals[key] ?? 0) + amount;
      grand += amount;
    }
  }

  if (grand <= 0) return [];

  return Object.entries(totals)
    .map(([category, revenue]) => ({
      category,
      revenue,
      percent: Number(((revenue / grand) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function countPendingCalls(calls: WaiterCallMetric[]) {
  return calls.filter((call) => isPendingCall(call.status)).length;
}
