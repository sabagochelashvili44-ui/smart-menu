import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireTenantApi } from "@/lib/tenant";
import {
  sanitizeWaiterCallItems,
  waiterCallItemsTotal,
  type WaiterCallLine,
} from "@/lib/waiter-call-items";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseWaiterPatch(body: { status?: string; items?: unknown }) {
  const acknowledge = body.status === "acknowledged";
  if (body.items === undefined) {
    return { acknowledge, items: undefined as WaiterCallLine[] | undefined, error: null };
  }
  const sanitized = sanitizeWaiterCallItems(body.items);
  if (sanitized === null) {
    return { acknowledge, items: undefined, error: "Invalid items" };
  }
  return { acknowledge, items: sanitized, error: null };
}

function waiterPatch(
  acknowledge: boolean,
  items: WaiterCallLine[] | undefined,
  withTimestamp: boolean,
) {
  const patch: Record<string, unknown> = {};
  if (acknowledge) {
    patch.status = "acknowledged";
    if (withTimestamp) patch.acknowledged_at = new Date().toISOString();
  }
  if (items !== undefined) patch.items = items;
  return patch;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tenant = await requireTenantApi();
  if (!tenant.ok) return tenant.response;

  const parsed = parseWaiterPatch(
    (await request.json()) as { status?: string; items?: unknown },
  );
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { acknowledge, items } = parsed;
  if (!acknowledge && items === undefined) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const restaurantId = tenant.restaurant.id;

  let { data, error } = await supabase
    .from("waiter_calls")
    .update(waiterPatch(acknowledge, items, true))
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id, items, status")
    .maybeSingle();

  if (error && acknowledge) {
    const retry = await supabase
      .from("waiter_calls")
      .update(waiterPatch(true, items, false))
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .select("id, items, status")
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (!error && data) {
    return NextResponse.json({ ok: true, call: data });
  }

  if (items !== undefined) {
    const orderPatch: Record<string, unknown> = {
      items,
      total_amount: waiterCallItemsTotal(items),
    };
    if (acknowledge) orderPatch.status = "acknowledged";
    const order = await supabase
      .from("orders")
      .update(orderPatch)
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .select("id, items, status")
      .maybeSingle();
    if (!order.error && order.data) {
      return NextResponse.json({ ok: true, call: order.data });
    }
    if (order.error) {
      return NextResponse.json({ error: order.error.message }, { status: 500 });
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tenant = await requireTenantApi();
  if (!tenant.ok) return tenant.response;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("waiter_calls")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", tenant.restaurant.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
