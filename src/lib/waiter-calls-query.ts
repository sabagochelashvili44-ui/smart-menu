import type { SupabaseClient } from "@supabase/supabase-js";
import { parseWaiterCallType } from "@/lib/waiter-call-types";

export const WAITER_CALL_SELECT =
  "id, restaurant_id, table_id, table_number, items, status, call_type, created_at";
export const WAITER_CALL_SELECT_LEGACY =
  "id, restaurant_id, table_id, table_number, items, status, created_at";

export function isMissingCallTypeColumn(error: { message?: string } | null | undefined) {
  const message = (error?.message ?? "").toLowerCase();
  return (
    message.includes("call_type") &&
    (message.includes("schema cache") ||
      message.includes("column") ||
      message.includes("could not find"))
  );
}

export async function selectWaiterCalls(
  supabase: SupabaseClient,
  restaurantId: string,
) {
  const withType = await supabase
    .from("waiter_calls")
    .select(WAITER_CALL_SELECT)
    .eq("restaurant_id", restaurantId)
    .in("status", ["open", "acknowledged"])
    .order("created_at", { ascending: false });

  if (!withType.error) return withType;

  if (!isMissingCallTypeColumn(withType.error)) return withType;

  return supabase
    .from("waiter_calls")
    .select(WAITER_CALL_SELECT_LEGACY)
    .eq("restaurant_id", restaurantId)
    .in("status", ["open", "acknowledged"])
    .order("created_at", { ascending: false });
}

export async function insertWaiterCall(
  supabase: SupabaseClient,
  row: {
    restaurant_id: string;
    table_id: string;
    table_number: string;
    items: unknown;
    status: string;
    call_type?: unknown;
  },
) {
  const payload = {
    restaurant_id: row.restaurant_id,
    table_id: row.table_id,
    table_number: row.table_number,
    items: row.items,
    status: row.status,
    call_type: parseWaiterCallType(row.call_type),
  };

  const withType = await supabase
    .from("waiter_calls")
    .insert(payload)
    .select(WAITER_CALL_SELECT)
    .single();

  if (!withType.error && withType.data) return withType;

  const message = (withType.error?.message ?? "").toLowerCase();
  const checkFailed =
    message.includes("waiter_calls_call_type_check") ||
    message.includes("violates check constraint");
  if (checkFailed && payload.call_type === "low_rating") {
    const fallback = await supabase
      .from("waiter_calls")
      .insert({ ...payload, call_type: "call_waiter" })
      .select(WAITER_CALL_SELECT)
      .single();
    if (!fallback.error && fallback.data) return fallback;
  }

  if (!isMissingCallTypeColumn(withType.error)) return withType;

  return supabase
    .from("waiter_calls")
    .insert({
      restaurant_id: payload.restaurant_id,
      table_id: payload.table_id,
      table_number: payload.table_number,
      items: payload.items,
      status: payload.status,
    })
    .select(WAITER_CALL_SELECT_LEGACY)
    .single();
}
