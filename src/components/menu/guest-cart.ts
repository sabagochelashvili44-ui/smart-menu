import type { CartLine } from "@/components/menu/cart-drawer";

export function applyQuantityDelta(
  current: CartLine[],
  dishId: string,
  delta: number,
  dish?: { id: string; name: string; price: number },
): CartLine[] {
  const row = current.find((line) => line.id === dishId);
  if (!row) {
    if (delta <= 0 || !dish) return current;
    return [
      ...current,
      {
        id: dish.id,
        name: dish.name,
        price: Number(dish.price),
        quantity: 1,
      },
    ];
  }

  const quantity = row.quantity + delta;
  if (quantity < 1) {
    return current.filter((line) => line.id !== dishId);
  }

  return current.map((line) =>
    line.id === dishId ? { ...line, quantity } : line,
  );
}

export function cartSubtotal(cart: CartLine[]) {
  return cart.reduce((sum, line) => sum + line.quantity * line.price, 0);
}
