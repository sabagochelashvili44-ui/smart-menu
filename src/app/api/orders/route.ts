import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export type OrderItemJson = {
  dish_id: string;
  name: string;
  quantity: number;
  unit_price: number;
};

function toItemsJson(raw: unknown): OrderItemJson[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        dish_id: String(row.dish_id ?? ""),
        name: String(row.name ?? "Item"),
        quantity: Number(row.quantity) || 0,
        unit_price: Number(row.unit_price) || 0,
      };
    })
    .filter((item) => item.quantity > 0);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const tableId = searchParams.get("tableId") ?? undefined;

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("orders")
    .select(
      "id, restaurant_id, table_id, status, total_amount, created_at, items",
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (tableId) {
    query = query.eq("table_id", tableId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = (data ?? []).map((order) => ({
    ...order,
    items: toItemsJson(order.items),
  }));

  return NextResponse.json({ orders });
}

export function POST() {
  return NextResponse.json(
    {
      error:
        "Guest tables no longer send kitchen tickets. Use Call Waiter instead.",
    },
    { status: 410 },
  );
}
