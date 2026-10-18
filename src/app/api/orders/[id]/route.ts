import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { OrderStatus } from "@/types/database";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { status?: OrderStatus };
  if (!body.status) {
    return NextResponse.json({ error: "status required" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: body.status })
    .eq("id", id)
    .select(
      "id, restaurant_id, table_id, status, total_amount, created_at, items",
    )
    .single();

  if (error || !order) {
    return NextResponse.json(
      { error: error?.message ?? "Order not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ order });
}
