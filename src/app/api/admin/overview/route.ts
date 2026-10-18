import { generateDailyDigest, isEmptySalesMetrics, parseAdminInsightLocale } from "@/lib/ai/analytics";
import { loadTodayOverview } from "@/lib/admin-overview-load";
import { requireTenantApi } from "@/lib/tenant";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const tenant = await requireTenantApi(["owner", "manager"]);
  if (!tenant.ok) return tenant.response;

  try {
    const data = await loadTodayOverview(tenant.restaurant.id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Overview failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const tenant = await requireTenantApi(["owner", "manager"]);
  if (!tenant.ok) return tenant.response;

  try {
    const body = (await request.json()) as { locale?: string };
    const locale = parseAdminInsightLocale(body.locale);
    const data = await loadTodayOverview(tenant.restaurant.id);
    if (isEmptySalesMetrics(data)) {
      return NextResponse.json({ digest: null, empty: true });
    }
    const digest = await generateDailyDigest(data, locale);
    return NextResponse.json({ digest });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Digest failed" },
      { status: 500 },
    );
  }
}
