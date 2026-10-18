export type WaiterCallLine = {
  dish_id: string;
  name: string;
  quantity: number;
  unit_price: number;
};

export function sanitizeWaiterCallItems(raw: unknown): WaiterCallLine[] | null {
  if (!Array.isArray(raw)) return null;
  const lines: WaiterCallLine[] = [];
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    const quantity = Math.min(99, Math.max(0, Math.floor(Number(row.quantity) || 0)));
    if (quantity < 1) continue;
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    lines.push({
      dish_id: String(row.dish_id ?? "").trim(),
      name,
      quantity,
      unit_price: Math.max(0, Number(row.unit_price) || 0),
    });
  }
  return lines;
}

export function waiterCallItemsTotal(items: WaiterCallLine[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
}
