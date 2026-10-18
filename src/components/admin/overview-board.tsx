"use client";

import { useAdminLocale } from "@/components/admin/admin-locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { categoryLabel, dishLabel, formatGel } from "@/lib/menu-copy";
import type { OverviewSnapshot } from "@/lib/overview-types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useCallback, useEffect, useMemo, useState } from "react";

type OverviewData = OverviewSnapshot;

export function OverviewBoard({
  restaurantId,
  initialData = null,
}: {
  restaurantId: string;
  initialData?: OverviewData | null;
}) {
  const { locale, t } = useAdminLocale();
  const [data, setData] = useState<OverviewData | null>(initialData);
  const [digest, setDigest] = useState<string | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/admin/overview?restaurantId=${restaurantId}`,
    );
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      throw new Error(json.error ?? "Overview failed");
    }
    return (await res.json()) as OverviewData;
  }, [restaurantId]);

  const loadDigest = useCallback(async () => {
    const res = await fetch("/api/admin/overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, locale }),
    });
    const json = (await res.json()) as { digest?: string; error?: string };
    if (!res.ok || !json.digest) {
      throw new Error(json.error ?? t.aiInsightsError);
    }
    return json.digest;
  }, [locale, restaurantId, t.aiInsightsError]);

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    void (async () => {
      try {
        const stats = await load();
        if (!cancelled) {
          setData(stats);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t.loadingOverview);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialData, load, t.loadingOverview]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`overview-waiter-calls-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waiter_calls",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          void load()
            .then((stats) => {
              setData(stats);
              setError(null);
            })
            .catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, restaurantId]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;

    if (!(data.orderCount > 0 || data.revenue > 0)) {
      setDigest(t.aiInsightsEmpty);
      setDigestLoading(false);
      return;
    }

    setDigestLoading(true);
    void (async () => {
      try {
        const text = await loadDigest();
        if (!cancelled) setDigest(text);
      } catch {
        if (!cancelled) setDigest(t.aiInsightsUnavailable);
      } finally {
        if (!cancelled) setDigestLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data, loadDigest, t.aiInsightsEmpty, t.aiInsightsUnavailable]);

  if (error && !data) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  if (!data) {
    return <p className="text-muted-foreground text-sm">{t.loadingOverview}</p>;
  }

  const peakOrders = useMemo(
    () => Math.max(0, ...data.hourly.map((row) => row.orders)),
    [data.hourly],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title={t.todayRevenue} value={formatGel(data.revenue)} />
        <Kpi title={t.todayOrders} value={String(data.orderCount)} />
        <Kpi title={t.pendingCallsKpi} value={String(data.pendingCalls)} />
        <Kpi title={t.aov} value={formatGel(data.aov)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.hourlyPeak}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.hourly.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t.noHourly}</p>
            ) : (
              data.hourly.map((row) => (
                <div key={row.hour} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="tabular-nums">{row.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {row.orders} {t.orderUnit}
                      {row.isPeak ? (
                        <Badge variant="default" className="ml-2">
                          {t.peakHour}
                        </Badge>
                      ) : null}
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className={
                        row.isPeak
                          ? "bg-primary h-full rounded-full"
                          : "bg-secondary h-full rounded-full"
                      }
                      style={{
                        width: `${peakOrders ? (row.orders / peakOrders) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.categorySplit}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.categories.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t.noCategorySales}</p>
            ) : (
              data.categories.map((row) => {
                const name =
                  row.category === "__other__"
                    ? t.otherCategory
                    : categoryLabel(row.category, locale);
                return (
                  <div key={row.category} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span>{name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {row.percent}% · {formatGel(row.revenue)}
                      </span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${Math.min(100, row.percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.topDishesToday}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.topToday.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t.noTopToday}</p>
          ) : (
            data.topToday.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>{dishLabel(row.name, locale)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {row.qty} {t.pieces}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.dailyDigest}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">
            {digestLoading ? t.generatingInsights : digest}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-primary text-2xl font-semibold tabular-nums">
        {value}
      </CardContent>
    </Card>
  );
}
