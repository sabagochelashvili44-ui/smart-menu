import {
  calendarDateInTbilisi,
  RESTAURANT_OFFSET,
  tbilisiDayEnd,
  tbilisiDayStart,
  tbilisiTrailingRange,
} from "@/lib/restaurant-day";

export const ANALYTICS_RANGE_PRESETS = [
  "today",
  "last7",
  "last30",
  "month",
  "custom",
] as const;

export type AnalyticsRangePreset = (typeof ANALYTICS_RANGE_PRESETS)[number];

export function isAnalyticsRangePreset(
  value: string | null | undefined,
): value is AnalyticsRangePreset {
  return ANALYTICS_RANGE_PRESETS.includes(value as AnalyticsRangePreset);
}

export function ymdInTbilisi(date: Date) {
  return calendarDateInTbilisi(date);
}

export function tbilisiStartOfYmd(ymd: string) {
  return new Date(`${ymd}T00:00:00${RESTAURANT_OFFSET}`);
}

export function tbilisiEndOfYmd(ymd: string) {
  return new Date(`${ymd}T23:59:59.999${RESTAURANT_OFFSET}`);
}

export function tbilisiMonthStart(now = new Date()) {
  const ymd = calendarDateInTbilisi(now);
  return tbilisiStartOfYmd(`${ymd.slice(0, 7)}-01`);
}

export function parseYmd(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = tbilisiStartOfYmd(value).getTime();
  return Number.isFinite(time) ? value : null;
}

export function precedingEqualRange(from: Date, to: Date) {
  const lengthMs = Math.max(1, to.getTime() - from.getTime());
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - lengthMs);
  return { from: prevFrom, to: prevTo };
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function pack(preset: AnalyticsRangePreset, from: Date, to: Date) {
  const days = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / 86_400_000),
  );
  return {
    preset,
    from,
    to,
    fromYmd: ymdInTbilisi(from),
    toYmd: ymdInTbilisi(to),
    days,
  };
}

export function resolveAnalyticsWindow(input: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const preset = isAnalyticsRangePreset(input.range) ? input.range : "last7";

  if (preset === "today") {
    return pack("today", tbilisiDayStart(now), tbilisiDayEnd(now));
  }
  if (preset === "last30") {
    const { from, to } = tbilisiTrailingRange(30, now);
    return pack("last30", from, to);
  }
  if (preset === "month") {
    return pack("month", tbilisiMonthStart(now), tbilisiDayEnd(now));
  }
  if (preset === "custom") {
    const fallback = tbilisiTrailingRange(7, now);
    let fromYmd = parseYmd(input.from) ?? ymdInTbilisi(fallback.from);
    let toYmd = parseYmd(input.to) ?? ymdInTbilisi(now);
    if (fromYmd > toYmd) {
      const swap = fromYmd;
      fromYmd = toYmd;
      toYmd = swap;
    }
    return pack("custom", tbilisiStartOfYmd(fromYmd), tbilisiEndOfYmd(toYmd));
  }

  const { from, to } = tbilisiTrailingRange(7, now);
  return pack("last7", from, to);
}
