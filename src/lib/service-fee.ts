export const SERVICE_FEE_ITEM_ID = "service_fee";

export function parseServiceFeePercent(raw: unknown) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}

export function cartTotals(subtotal: number, percent: number) {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  const safePercent = parseServiceFeePercent(percent);
  const serviceFee =
    Math.round(safeSubtotal * (safePercent / 100) * 100) / 100;
  const grandTotal = Math.round((safeSubtotal + serviceFee) * 100) / 100;
  return { subtotal: safeSubtotal, percent: safePercent, serviceFee, grandTotal };
}

export type CartTotals = ReturnType<typeof cartTotals>;

export function restaurantGoogleMapsUrl(row: {
  google_maps_review_url?: string | null;
  google_review_url?: string | null;
}) {
  const url =
    row.google_maps_review_url?.trim() || row.google_review_url?.trim() || "";
  return url || null;
}

export function isServiceFeeItem(item: { dish_id?: string | null }) {
  return item.dish_id === SERVICE_FEE_ITEM_ID;
}

export function splitPricedItems(
  items: Array<{ dish_id: string; quantity: number; unit_price: number }>,
) {
  const dishes = items.filter((item) => !isServiceFeeItem(item));
  const fees = items.filter((item) => isServiceFeeItem(item));
  const subtotal = dishes.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  const serviceFee = fees.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  return {
    dishes,
    subtotal,
    serviceFee,
    grandTotal: subtotal + serviceFee,
  };
}

export function ticketPriceBreakdown(
  items: Array<{ dish_id: string; quantity: number; unit_price: number }>,
  fallbackPercent = 0,
) {
  const split = splitPricedItems(items);
  if (split.serviceFee > 0) {
    const percent =
      split.subtotal > 0
        ? Math.round((split.serviceFee / split.subtotal) * 10000) / 100
        : parseServiceFeePercent(fallbackPercent);
    return { ...split, percent };
  }
  return {
    dishes: split.dishes,
    ...cartTotals(split.subtotal, fallbackPercent),
  };
}

export function syncServiceFeeLine<
  T extends { dish_id: string; name: string; quantity: number; unit_price: number },
>(items: T[], percent: number, feeName: string): T[] {
  const dishes = items.filter((item) => !isServiceFeeItem(item));
  const { serviceFee } = cartTotals(
    dishes.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    percent,
  );
  if (serviceFee <= 0) return dishes;
  return [
    ...dishes,
    {
      dish_id: SERVICE_FEE_ITEM_ID,
      name: feeName,
      quantity: 1,
      unit_price: serviceFee,
    } as T,
  ];
}
