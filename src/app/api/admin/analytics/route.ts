import { generateAnalyticsInsights, isEmptySalesMetrics, parseAdminInsightLocale } from "@/lib/ai/analytics";
import {
  loadRestaurantAnalyticsContext,
  snapshotForCreatedAtWindow,
} from "@/lib/admin-analytics-load";
import {
  percentChange,
  precedingEqualRange,
  resolveAnalyticsWindow,
} from "@/lib/analytics-range";
import { computeHourlyAcknowledgedOrders } from "@/lib/overview-ops";
import { requireTenantApi } from "@/lib/tenant";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

async function loadRangedAnalytics(
  restaurantId: string,
  range?: string | null,
  fromParam?: string | null,
  toParam?: string | null,
) {
  const window = resolveAnalyticsWindow({
    range,
    from: fromParam,
    to: toParam,
  });
  const previous = precedingEqualRange(window.from, window.to);

  const context = await loadRestaurantAnalyticsContext(restaurantId, {
    createdAtGte: previous.from.toISOString(),
    createdAtLte: window.to.toISOString(),
  });

  const snapshot = snapshotForCreatedAtWindow(context, window.from, window.to);
  const previousSnapshot = snapshotForCreatedAtWindow(
    context,
    previous.from,
    previous.to,
  );
  const peakHours = computeHourlyAcknowledgedOrders(
    context.waiterCalls,
    window.from,
    window.to,
  );

  return {
    ...snapshot,
    window: window.preset,
    windowDays: window.days,
    windowFrom: window.from.toISOString(),
    windowTo: window.to.toISOString(),
    windowFromYmd: window.fromYmd,
    windowToYmd: window.toYmd,
    peakHours,
    previous: {
      revenue: previousSnapshot.revenue,
      orderCount: previousSnapshot.orderCount,
      aov: previousSnapshot.aov,
      waiterCallCount: previousSnapshot.waiterCallCount,
      estimatedProfit: previousSnapshot.estimatedProfit,
      lostRevenue: previousSnapshot.lostRevenue,
      orderConversionRate: previousSnapshot.orderConversionRate,
    },
    comparison: {
      revenue: percentChange(snapshot.revenue, previousSnapshot.revenue),
      orderCount: percentChange(
        snapshot.orderCount,
        previousSnapshot.orderCount,
      ),
      aov: percentChange(snapshot.aov, previousSnapshot.aov),
      waiterCallCount: percentChange(
        snapshot.waiterCallCount,
        previousSnapshot.waiterCallCount,
      ),
    },
    observationReady: true,
  };
}

function rangeFromRequest(request: Request) {
  const url = new URL(request.url);
  return {
    range: url.searchParams.get("range"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  };
}

export async function GET(request: Request) {
  const tenant = await requireTenantApi(["owner"]);
  if (!tenant.ok) return tenant.response;

  try {
    const { range, from, to } = rangeFromRequest(request);
    const data = await loadRangedAnalytics(tenant.restaurant.id, range, from, to);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analytics failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const tenant = await requireTenantApi(["owner"]);
  if (!tenant.ok) return tenant.response;

  const body = (await request.json()) as {
    locale?: string;
    range?: string;
    from?: string;
    to?: string;
  };
  const locale = parseAdminInsightLocale(body.locale);
  const query = rangeFromRequest(request);

  try {
    const snapshot = await loadRangedAnalytics(
      tenant.restaurant.id,
      body.range ?? query.range,
      body.from ?? query.from,
      body.to ?? query.to,
    );
    if (isEmptySalesMetrics(snapshot)) {
      return NextResponse.json({ insights: null, empty: true });
    }
    const insights = await generateAnalyticsInsights(snapshot, locale);
    return NextResponse.json({
      insights,
      observationReady: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI insights failed",
      },
      { status: 500 },
    );
  }
}
