import {
  computeAnalytics,
  isAcknowledgedCall,
  parseAnalyticsItems,
  type AnalyticsDish,
  type AnalyticsReview,
  type IntentEvent,
  type WaiterCallMetric,
} from "@/lib/ai/analytics";
import { isTimestampInRange } from "@/lib/restaurant-day";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function loadRestaurantAnalyticsContext(
  restaurantId: string,
  options?: { createdAtGte?: string; createdAtLte?: string },
) {
  const supabase = createSupabaseAdminClient();

  const applyCreatedAt = <
    Q extends { gte: (col: string, value: string) => Q; lte: (col: string, value: string) => Q },
  >(
    query: Q,
  ) => {
    let next = query;
    if (options?.createdAtGte) {
      next = next.gte("created_at", options.createdAtGte);
    }
    if (options?.createdAtLte) {
      next = next.lte("created_at", options.createdAtLte);
    }
    return next;
  };

  const [categoriesResult, callsResult, reviewsResult, intentResult, tablesResult, ordersResult] =
    await Promise.all([
      supabase.from("categories").select("id, name").eq("restaurant_id", restaurantId),
      applyCreatedAt(
        supabase
          .from("waiter_calls")
          .select(
            "id, items, status, created_at, acknowledged_at, table_id, table_number",
          )
          .eq("restaurant_id", restaurantId),
      ),
      supabase
        .from("reviews")
        .select("rating, feedback")
        .eq("restaurant_id", restaurantId),
      applyCreatedAt(
        supabase
          .from("guest_intent_events")
          .select(
            "dish_id, dish_name, event_type, quantity, unit_price, created_at",
          )
          .eq("restaurant_id", restaurantId),
      ),
      supabase
        .from("tables")
        .select("id, table_number")
        .eq("restaurant_id", restaurantId)
        .order("table_number"),
      applyCreatedAt(
        supabase
          .from("orders")
          .select("id, items, status, created_at, table_id, total_amount")
          .eq("restaurant_id", restaurantId),
      ),
    ]);

  if (categoriesResult.error) throw new Error(categoriesResult.error.message);
  if (callsResult.error) throw new Error(callsResult.error.message);

  const categoryRows = (categoriesResult.data ?? []).map((row) => {
    const category = row as Record<string, unknown>;
    return {
      id: String(category.id),
      name: String(category.name ?? ""),
    };
  });
  const categoryIds = categoryRows.map((row) => row.id);
  const categoryNameById = new Map(categoryRows.map((row) => [row.id, row.name]));

  let dishes: AnalyticsDish[] = [];
  if (categoryIds.length > 0) {
    let { data, error } = await supabase
      .from("dishes")
      .select("id, name, price, margin_score, is_available, category_id")
      .in("category_id", categoryIds)
      .eq("restaurant_id", restaurantId);
    if (error) {
      const retry = await supabase
        .from("dishes")
        .select("id, name, price, margin_score, is_available, category_id")
        .in("category_id", categoryIds);
      data = retry.data;
      error = retry.error;
    }
    if (error) throw new Error(error.message);
    dishes = (data ?? []).map((row) => {
      const dish = row as Record<string, unknown>;
      const categoryId = String(dish.category_id ?? "");
      return {
        id: String(dish.id),
        name: String(dish.name ?? "Item"),
        price: Number(dish.price) || 0,
        margin_score: Number(dish.margin_score) || 0,
        is_available: Boolean(dish.is_available),
        category_id: categoryId,
        category: categoryNameById.get(categoryId) ?? "",
      };
    });
  }

  const waiterCalls: WaiterCallMetric[] = (callsResult.data ?? []).map((row) => {
    const call = row as Record<string, unknown>;
    return {
      id: String(call.id),
      table_id: call.table_id ? String(call.table_id) : undefined,
      table_number: String(call.table_number ?? ""),
      items: parseAnalyticsItems(call.items),
      status: String(call.status ?? "open"),
      created_at: call.created_at ? String(call.created_at) : undefined,
      acknowledged_at: call.acknowledged_at
        ? String(call.acknowledged_at)
        : null,
    };
  });

  const intentEvents: IntentEvent[] = intentResult.error
    ? []
    : (intentResult.data ?? []).map((row) => {
        const event = row as Record<string, unknown>;
        return {
          dish_id: String(event.dish_id ?? ""),
          dish_name: String(event.dish_name ?? ""),
          event_type: String(event.event_type ?? ""),
          quantity: Number(event.quantity) || 1,
          unit_price: Number(event.unit_price) || 0,
          created_at: event.created_at ? String(event.created_at) : undefined,
        };
      });

  const reviews: AnalyticsReview[] = reviewsResult.error
    ? []
    : (reviewsResult.data ?? []).map((row) => {
        const review = row as Record<string, unknown>;
        return {
          rating: Number(review.rating) || 0,
          feedback: String(review.feedback ?? ""),
        };
      });

  const tables = tablesResult.error
    ? []
    : (tablesResult.data ?? []).map((row) => {
        const table = row as Record<string, unknown>;
        return {
          id: String(table.id),
          table_number: String(table.table_number ?? ""),
        };
      });

  const orderTicketCount = ordersResult.error
    ? 0
    : (ordersResult.data ?? []).length;

  return { dishes, reviews, intentEvents, waiterCalls, tables, orderTicketCount };
}

export function filterCallsForWindow(
  calls: WaiterCallMetric[],
  from: Date,
  to: Date,
) {
  return calls.filter(
    (call) =>
      isTimestampInRange(call.created_at, from, to) ||
      isTimestampInRange(call.acknowledged_at, from, to),
  );
}

export function filterIntentForWindow(
  events: IntentEvent[],
  from: Date,
  to: Date,
) {
  return events.filter((event) =>
    isTimestampInRange(event.created_at, from, to),
  );
}

export function snapshotForWindow(
  context: Awaited<ReturnType<typeof loadRestaurantAnalyticsContext>>,
  from: Date,
  to: Date,
) {
  return computeAnalytics({
    dishes: context.dishes,
    reviews: context.reviews,
    intentEvents: filterIntentForWindow(context.intentEvents, from, to),
    waiterCalls: filterCallsForWindow(context.waiterCalls, from, to),
  });
}

export function snapshotForCreatedAtWindow(
  context: Awaited<ReturnType<typeof loadRestaurantAnalyticsContext>>,
  from: Date,
  to: Date,
) {
  return computeAnalytics({
    dishes: context.dishes,
    reviews: context.reviews,
    intentEvents: filterIntentForWindow(context.intentEvents, from, to),
    waiterCalls: context.waiterCalls.filter((call) =>
      isTimestampInRange(call.created_at, from, to),
    ),
  });
}

export function salesObservationCycle(
  calls: WaiterCallMetric[],
  now = new Date(),
) {
  const times = calls
    .filter((call) => isAcknowledgedCall(call.status))
    .map((call) =>
      new Date(call.acknowledged_at || call.created_at || "").getTime(),
    )
    .filter((time) => Number.isFinite(time));

  if (!times.length) {
    return {
      observationReady: false,
      observationDaysElapsed: 0,
      firstAcknowledgedAt: null as string | null,
    };
  }

  const first = Math.min(...times);
  const elapsedMs = now.getTime() - first;
  const observationReady = elapsedMs >= 7 * 86_400_000;
  const observationDaysElapsed = observationReady
    ? 7
    : Math.min(7, Math.max(1, Math.floor(elapsedMs / 86_400_000) + 1));

  return {
    observationReady,
    observationDaysElapsed,
    firstAcknowledgedAt: new Date(first).toISOString(),
  };
}
