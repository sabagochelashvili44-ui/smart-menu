type IntentEventType = "view" | "cart_add" | "cart_remove";

const viewed = new Set<string>();

export function trackGuestIntent(input: {
  restaurantId: string;
  tableId?: string | null;
  eventType: IntentEventType;
  dishId: string;
  dishName: string;
  quantity?: number;
  unitPrice?: number;
}) {
  if (typeof window === "undefined") return;
  if (input.eventType === "view") {
    if (viewed.has(input.dishId)) return;
    viewed.add(input.dishId);
  }

  void fetch("/api/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      restaurant_id: input.restaurantId,
      table_id: input.tableId ?? null,
      events: [
        {
          event_type: input.eventType,
          dish_id: input.dishId,
          dish_name: input.dishName,
          quantity: input.quantity ?? 1,
          unit_price: input.unitPrice ?? 0,
        },
      ],
    }),
    keepalive: true,
  }).catch(() => undefined);
}
