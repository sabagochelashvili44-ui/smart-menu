/** Georgian House floor clock — Georgia is UTC+4 year-round. */
export const RESTAURANT_TZ = "Asia/Tbilisi";
export const RESTAURANT_OFFSET = "+04:00";

export function calendarDateInTbilisi(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RESTAURANT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function tbilisiDayStart(now = new Date()) {
  const ymd = calendarDateInTbilisi(now);
  return new Date(`${ymd}T00:00:00${RESTAURANT_OFFSET}`);
}

export function tbilisiDayEnd(now = new Date()) {
  const ymd = calendarDateInTbilisi(now);
  return new Date(`${ymd}T23:59:59.999${RESTAURANT_OFFSET}`);
}

/** Inclusive window of `days` calendar days ending today (Tbilisi). */
export function tbilisiTrailingRange(days: number, now = new Date()) {
  const to = tbilisiDayEnd(now);
  const from = new Date(tbilisiDayStart(now).getTime() - (days - 1) * 86_400_000);
  return { from, to };
}

export function rollingWindowDays(days: number, now = new Date()) {
  return {
    from: new Date(now.getTime() - days * 86_400_000),
    to: now,
  };
}

export function isTimestampInRange(
  iso: string | null | undefined,
  from: Date,
  to: Date,
) {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return time >= from.getTime() && time <= to.getTime();
}
