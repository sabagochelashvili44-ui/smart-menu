import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireTenantApi } from "@/lib/tenant";
import {
  insertWaiterCall,
  selectWaiterCalls,
} from "@/lib/waiter-calls-query";
import {
  parseWaiterCallType,
  type WaiterCallType,
} from "@/lib/waiter-call-types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export type WaiterCallItem = {
  dish_id: string;
  name: string;
  quantity: number;
  unit_price: number;
};

export type WaiterCall = {
  id: string;
  restaurant_id: string;
  table_id: string;
  table_number: string;
  items: WaiterCallItem[];
  status: string;
  call_type: WaiterCallType;
  created_at: string;
};

function toItems(raw: unknown): WaiterCallItem[] {
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

function toCall(row: Record<string, unknown>): WaiterCall {
  return {
    id: String(row.id),
    restaurant_id: String(row.restaurant_id),
    table_id: String(row.table_id),
    table_number: String(row.table_number ?? ""),
    items: toItems(row.items),
    status: String(row.status ?? "open"),
    call_type: parseWaiterCallType(row.call_type),
    created_at: String(row.created_at),
  };
}

export async function GET() {
  const tenant = await requireTenantApi();
  if (!tenant.ok) return tenant.response;
  const restaurantId = tenant.restaurant.id;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await selectWaiterCalls(supabase, restaurantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    calls: (data ?? []).map((row) => toCall(row as Record<string, unknown>)),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    restaurant_id?: string;
    table_id?: string;
    table_number?: string;
    items?: unknown;
    call_type?: unknown;
  };

  if (!body.restaurant_id || !body.table_id) {
    return NextResponse.json({ error: "Invalid waiter call" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: table } = await supabase
    .from("tables")
    .select("id, restaurant_id, table_number")
    .eq("id", body.table_id)
    .eq("restaurant_id", body.restaurant_id)
    .maybeSingle();

  if (!table) {
    return NextResponse.json({ error: "Invalid waiter call" }, { status: 400 });
  }

  const { data, error } = await insertWaiterCall(supabase, {
    restaurant_id: table.restaurant_id,
    table_id: table.id,
    table_number: body.table_number?.trim() || table.table_number || "",
    items: toItems(body.items),
    status: "open",
    call_type: parseWaiterCallType(body.call_type),
  });

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not call the waiter" },
      { status: 500 },
    );
  }

  return NextResponse.json({ call: toCall(data as Record<string, unknown>) });
}

export async function DELETE() {
  const tenant = await requireTenantApi();
  if (!tenant.ok) return tenant.response;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("waiter_calls")
    .delete()
    .eq("restaurant_id", tenant.restaurant.id)
    .eq("status", "acknowledged");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
