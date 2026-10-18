import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type IntentBody = {
  restaurant_id?: string;
  table_id?: string | null;
  events?: {
    event_type?: string;
    dish_id?: string;
    dish_name?: string;
    quantity?: number;
    unit_price?: number;
  }[];
};

const ALLOWED = new Set(["view", "cart_add", "cart_remove"]);

export async function POST(request: Request) {
  const body = (await request.json()) as IntentBody;
  const restaurantId = body.restaurant_id?.trim();
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id required" }, { status: 400 });
  }

  const rows = (body.events ?? [])
    .map((event) => {
      const eventType = String(event.event_type ?? "");
      if (!ALLOWED.has(eventType)) return null;
      return {
        restaurant_id: restaurantId,
        table_id: body.table_id?.trim() || null,
        dish_id: String(event.dish_id ?? ""),
        dish_name: String(event.dish_name ?? "").slice(0, 200),
        event_type: eventType,
        quantity: Math.max(1, Number(event.quantity) || 1),
        unit_price: Number(event.unit_price) || 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (!rows.length) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("guest_intent_events").insert(rows);

  if (error) {
    return NextResponse.json({ ok: true, skipped: true, error: error.message });
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}
