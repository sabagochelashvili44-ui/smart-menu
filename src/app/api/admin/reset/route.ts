import { resetStore } from "@/lib/data/store";
import { requireTenantRestaurant } from "@/lib/tenant";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const ctx = await requireTenantRestaurant();
  if (!ctx.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ctx.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const store = await resetStore();
  return NextResponse.json({ ok: true, restaurants: store.restaurants.length });
}
