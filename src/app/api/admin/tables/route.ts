import { getMenu, upsertTable } from "@/lib/data/store";
import { requireTenantApi } from "@/lib/tenant";
import type { Table } from "@/types/database";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const tenant = await requireTenantApi();
  if (!tenant.ok) return tenant.response;

  const menu = await getMenu(tenant.restaurant.id);
  if (!menu) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }
  return NextResponse.json({ restaurant: menu.restaurant, tables: menu.tables });
}

export async function POST(request: Request) {
  const tenant = await requireTenantApi(["owner", "manager"]);
  if (!tenant.ok) return tenant.response;

  const body = (await request.json()) as Partial<Table>;
  if (!body.table_number) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }
  const table: Table = {
    id: body.id || `table-${crypto.randomUUID().slice(0, 8)}`,
    restaurant_id: tenant.restaurant.id,
    table_number: body.table_number,
  };
  return NextResponse.json({ table: await upsertTable(table) });
}
