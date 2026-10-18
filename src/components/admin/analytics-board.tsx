"use client";

import { useAdminLocale } from "@/components/admin/admin-locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AnalyticsInsights } from "@/lib/ai/analytics";
import { isEmptySalesMetrics } from "@/lib/ai/analytics";
import { engineeringRoleLabel } from "@/lib/admin-i18n";
import {
  isAnalyticsRangePreset,
  type AnalyticsRangePreset,
} from "@/lib/analytics-range";
import { dishLabel, formatGel } from "@/lib/menu-copy";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type EngineeringRow = {
  id: string;
  name: string;
  margin_score: number;
  qty: number;
  revenue: number;
  profit?: number;
  profitIndex?: number;
  views?: number;
  cartAdds?: number;
  waiterShown?: number;
  abandonedQty?: number;
  conversion?: number;
  role: string;
  is_available: boolean;
};

type Analytics = {
  revenue: number;
  orderCount: number;
  windowDays?: number;
  window?: string;
  windowFromYmd?: string;
  windowToYmd?: string;
  observationReady?: boolean;
  observationDaysElapsed?: number;
  lostRevenue?: number;
  aov?: number;
  orderConversionRate?: number;
  estimatedProfit?: number;
  avgWaitMinutes?: number;
  waiterCallCount?: number;
  avgRating: number;
  comparison?: {
    revenue: number;
    orderCount: number;
    aov: number;
    waiterCallCount: number;
  };
  peakHours?: { label: string; orders: number; isPeak?: boolean }[];
  engineering: EngineeringRow[];
  popularDishes?: { id: string; name: string; qty: number; revenue: number }[];
  highMarginStars?: EngineeringRow[];
  financialRisk?: EngineeringRow[];
  intentRows?: EngineeringRow[];
  comboOffers?: { left: string; right: string; count: number }[];
  wasteRisk: EngineeringRow[];
  upsell: { name: string; margin_score: number }[];
  negativeReviews: { rating: number; feedback: string }[];
};

function rangeQuery(preset: AnalyticsRangePreset, fromYmd: string, toYmd: string) {
  const params = new URLSearchParams();
  params.set("range", preset);
  if (preset === "custom") {
    params.set("from", fromYmd);
    params.set("to", toYmd);
  }
  return params.toString();
}

export function AnalyticsBoard({ restaurantId }: { restaurantId: string }) {
  const { locale, t } = useAdminLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Analytics | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const rangeParam = searchParams.get("range");
  const preset: AnalyticsRangePreset = isAnalyticsRangePreset(rangeParam)
    ? rangeParam
    : "last7";
  const fromYmd = searchParams.get("from") ?? "";
  const toYmd = searchParams.get("to") ?? "";

  const query = useMemo(
    () => rangeQuery(preset, fromYmd, toYmd),
    [fromYmd, preset, toYmd],
  );

  useEffect(() => {
    if (preset !== "custom") return;
    if (fromYmd) setCustomFrom(fromYmd);
    if (toYmd) setCustomTo(toYmd);
  }, [fromYmd, preset, toYmd]);

  const rangeLabel =
    preset === "today"
      ? t.rangeToday
      : preset === "last30"
        ? t.rangeLast30
        : preset === "month"
          ? t.rangeMonth
          : preset === "custom"
            ? t.rangeCustom
            : t.rangeLast7;

  function applyRange(next: AnalyticsRangePreset, from = customFrom, to = customTo) {
    const qs = rangeQuery(next, from, to);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const loadStats = useCallback(async () => {
    const res = await fetch(
      `/api/admin/analytics?restaurantId=${restaurantId}&${query}`,
    );
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      throw new Error(json.error ?? "Analytics failed");
    }
    return (await res.json()) as Analytics;
  }, [query, restaurantId]);

  const loadInsights = useCallback(async () => {
    const res = await fetch("/api/admin/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        locale,
        range: preset,
        from: fromYmd || undefined,
        to: toYmd || undefined,
      }),
    });
    const json = (await res.json()) as {
      insights?: AnalyticsInsights | null;
      observationReady?: boolean;
      error?: string;
    };
    if (json.observationReady === false) {
      return null;
    }
    if (!res.ok || !json.insights) {
      throw new Error(json.error ?? t.aiInsightsError);
    }
    return json.insights;
  }, [fromYmd, locale, preset, restaurantId, t.aiInsightsError, toYmd]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stats = await loadStats();
        if (!cancelled) {
          setData(stats);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : t.loadingAnalytics);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStats, t.loadingAnalytics]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;

    if (isEmptySalesMetrics(data)) {
      setInsights(null);
      setInsightError(null);
      setInsightLoading(false);
      return;
    }

    setInsightLoading(true);
    setInsightError(null);
    void (async () => {
      try {
        const nextInsights = await loadInsights();
        if (!cancelled) {
          setInsights(nextInsights);
          setInsightError(null);
        }
      } catch {
        if (!cancelled) {
          setInsights(null);
          setInsightError(t.aiInsightsUnavailable);
        }
      } finally {
        if (!cancelled) setInsightLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    data,
    loadInsights,
    t.aiInsightsUnavailable,
  ]);

  async function refreshInsights() {
    setRefreshing(true);
    setInsightError(null);
    try {
      const stats = await loadStats();
      setData(stats);
      if (isEmptySalesMetrics(stats)) {
        setInsights(null);
        return;
      }
      setInsightLoading(true);
      try {
        const nextInsights = await loadInsights();
        setInsights(nextInsights);
      } catch {
        setInsights(null);
        setInsightError(t.aiInsightsUnavailable);
      } finally {
        setInsightLoading(false);
      }
    } catch {
      setInsightError(t.aiInsightsUnavailable);
    } finally {
      setRefreshing(false);
    }
  }

  if (loadError && !data) {
    return <p className="text-destructive text-sm">{loadError}</p>;
  }

  if (!data) {
    return <p className="text-muted-foreground text-sm">{t.loadingAnalytics}</p>;
  }

  const popular = data.popularDishes ?? [];
  const stars = (data.highMarginStars ?? []).slice(0, 8);
  const risks = (data.financialRisk?.length
    ? data.financialRisk
    : data.wasteRisk
  ).slice(0, 10);
  const intent = (data.intentRows ?? []).slice(0, 10);
  const combos = data.comboOffers ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t.strategicWindow}</span>
            <select
              className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
              value={preset}
              onChange={(event) => {
                const next = event.target.value as AnalyticsRangePreset;
                if (next === "custom") {
                  applyRange(
                    "custom",
                    customFrom || data.windowFromYmd || "",
                    customTo || data.windowToYmd || "",
                  );
                  return;
                }
                applyRange(next);
              }}
            >
              <option value="today">{t.rangeToday}</option>
              <option value="last7">{t.rangeLast7}</option>
              <option value="last30">{t.rangeLast30}</option>
              <option value="month">{t.rangeMonth}</option>
              <option value="custom">{t.rangeCustom}</option>
            </select>
          </label>
          {preset === "custom" ? (
            <>
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">{t.rangeStart}</span>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">{t.rangeEnd}</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                />
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!customFrom || !customTo}
                onClick={() => applyRange("custom", customFrom, customTo)}
              >
                {t.rangeCustom}
              </Button>
            </>
          ) : null}
          <p className="text-muted-foreground pb-1 text-xs">
            {rangeLabel}
            {data?.windowFromYmd && data?.windowToYmd
              ? ` · ${data.windowFromYmd} → ${data.windowToYmd}`
              : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={
            refreshing ||
            insightLoading ||
            isEmptySalesMetrics(data)
          }
          onClick={() => void refreshInsights()}
        >
          {refreshing ? t.generatingInsights : t.refreshAiInsights}
        </Button>
      </div>

      {data.observationReady === false ? (
        <div className="rounded-xl border border-secondary/40 bg-muted/40 px-4 py-3">
          <Badge variant="secondary" className="mb-2 text-sm font-medium">
            {t.observationCycle}
          </Badge>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t.observationUnlock} ({data.observationDaysElapsed ?? 0}/7{" "}
            {t.observationProgress})
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          title={t.confirmedRevenue}
          value={formatGel(data.revenue)}
          delta={data.comparison?.revenue}
          deltaLabel={t.vsPreviousPeriod}
        />
        <Kpi
          title={t.confirmedOrders}
          value={String(data.orderCount)}
          delta={data.comparison?.orderCount}
          deltaLabel={t.vsPreviousPeriod}
        />
        <Kpi
          title={t.orderConversion}
          value={`${Math.round((data.orderConversionRate ?? 0) * 100)}%`}
        />
        <Kpi
          title={t.aov}
          value={formatGel(data.aov ?? 0)}
          delta={data.comparison?.aov}
          deltaLabel={t.vsPreviousPeriod}
        />
        <Kpi
          title={t.estimatedProfit}
          value={formatGel(data.estimatedProfit ?? 0)}
        />
        <Kpi
          title={t.lostRevenue}
          value={formatGel(data.lostRevenue ?? 0)}
        />
        <Kpi
          title={t.waiterCallCount}
          value={String(data.waiterCallCount ?? 0)}
          delta={data.comparison?.waiterCallCount}
          deltaLabel={t.vsPreviousPeriod}
        />
        <Kpi
          title={t.avgWait}
          value={`${data.avgWaitMinutes ?? 0} ${t.minutes}`}
        />
      </div>

      {(data.peakHours ?? []).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.hourlyPeak}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            {data.peakHours!.slice(0, 8).map((row) => (
              <Badge
                key={row.label}
                variant={row.isPeak ? "default" : "outline"}
              >
                {row.label} · {row.orders}
                {row.isPeak ? ` ${t.peakHour}` : ""}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t.advisor}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEmptySalesMetrics(data) ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t.aiInsightsEmpty}
            </p>
          ) : insightLoading ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t.generatingInsights}
            </p>
          ) : insightError ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t.aiInsightsUnavailable}
            </p>
          ) : (
            <>
          <AdviceBlock
            title={t.weeklyFinance}
            body={insights?.weeklyFinance ?? insights?.marginGrowth}
            loading={false}
            loadingLabel={t.generatingInsights}
          />
          <AdviceBlock
            title={t.menuOptimization}
            body={insights?.menuOptimization ?? insights?.menuEngineering}
            loading={false}
            loadingLabel={t.generatingInsights}
          />
          <AdviceBlock
            title={t.cartAbandonment}
            body={insights?.cartAbandonment ?? insights?.behavioralInsights}
            loading={false}
            loadingLabel={t.generatingInsights}
          />
          <AdviceBlock
            title={t.nextWeekActions}
            body={insights?.nextWeekActions ?? insights?.operationalRisk}
            loading={false}
            loadingLabel={t.generatingInsights}
          />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.popularDishes}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {popular.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t.noSalesYet}</p>
          ) : (
            popular.slice(0, 10).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-2">
                <span className="text-sm">{dishLabel(row.name, locale)}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {row.qty} {t.sold} · {formatGel(row.revenue)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.highMarginStars}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stars.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t.noSalesYet}</p>
            ) : (
              stars.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{dishLabel(row.name, locale)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {row.qty} {t.sold} · {t.margin} {row.margin_score}/12
                    </span>
                    <Badge variant="secondary">
                      {engineeringRoleLabel(locale, row.role)}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.financialRisk}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {risks.length === 0 ? (
              <p className="text-muted-foreground">{t.no86}</p>
            ) : (
              risks.map((row) => (
                <div key={row.id ?? row.name} className="flex justify-between gap-2">
                  <span>{dishLabel(row.name, locale)}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {row.qty ?? 0} {t.sold}
                    {row.abandonedQty
                      ? ` · ${row.abandonedQty} ${t.abandoned}`
                      : ""}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.customerIntent}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t.intentHint}
          </p>
          {intent.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t.noIntentYet}</p>
          ) : (
            intent.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-2">
                <span className="text-sm">{dishLabel(row.name, locale)}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {row.views ?? 0} {t.views} · {row.cartAdds ?? 0} {t.cartAdds} ·{" "}
                  {row.abandonedQty ?? 0} {t.abandoned} · {t.sold} {row.qty}{" "}
                  <span className="text-[10px] uppercase">{t.notSales}</span>
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.comboOffers}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {combos.length === 0 ? (
            <p className="text-muted-foreground">{t.noCombos}</p>
          ) : (
            combos.map((row) => (
              <p key={`${row.left}-${row.right}`}>
                {dishLabel(row.left, locale)} + {dishLabel(row.right, locale)}{" "}
                <span className="text-muted-foreground">({row.count})</span>
              </p>
            ))
          )}
          {data.upsell.slice(0, 4).map((row) => (
            <p key={row.name}>
              {t.push} {dishLabel(row.name, locale)} ({t.margin}{" "}
              {row.margin_score}/12)
            </p>
          ))}
        </CardContent>
      </Card>

      {data.negativeReviews.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.negativeWatch}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.negativeReviews.map((review, i) => (
              <p key={`${review.rating}-${i}`}>
                {review.rating}/5 — {review.feedback}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Kpi({
  title,
  value,
  delta,
  deltaLabel,
}: {
  title: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
}) {
  const deltaText =
    typeof delta === "number"
      ? `${delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} ${Math.abs(delta)}%`
      : null;
  const deltaClass =
    typeof delta === "number"
      ? delta > 0
        ? "text-emerald-600"
        : delta < 0
          ? "text-destructive"
          : "text-muted-foreground"
      : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-primary text-2xl font-semibold tabular-nums">{value}</p>
        {deltaText ? (
          <p className={`mt-1 text-xs ${deltaClass}`}>
            {deltaText}
            {deltaLabel ? ` · ${deltaLabel}` : ""}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AdviceBlock({
  title,
  body,
  loading,
  loadingLabel,
}: {
  title: string;
  body?: string;
  loading: boolean;
  loadingLabel: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{title}</p>
      {body ? (
        <p className="text-sm leading-relaxed">{body}</p>
      ) : loading ? (
        <p className="text-muted-foreground text-sm">{loadingLabel}</p>
      ) : null}
    </div>
  );
}
