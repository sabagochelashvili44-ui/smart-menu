export const WAITER_CALL_TYPES = [
  "call_waiter",
  "clean_table",
  "bill_card",
  "bill_cash",
  "low_rating",
] as const;

export type WaiterCallType = (typeof WAITER_CALL_TYPES)[number];

export const GUEST_WAITER_CALL_TYPES = [
  "call_waiter",
  "clean_table",
  "bill_card",
  "bill_cash",
] as const satisfies readonly WaiterCallType[];

export function isWaiterCallType(
  value: string | null | undefined,
): value is WaiterCallType {
  return (WAITER_CALL_TYPES as readonly string[]).includes(value ?? "");
}

export function parseWaiterCallType(value: unknown): WaiterCallType {
  const raw = String(value ?? "").trim();
  return isWaiterCallType(raw) ? raw : "call_waiter";
}

export const WAITER_CALL_LABELS: Record<
  WaiterCallType,
  { ka: string; en: string; ru: string }
> = {
  call_waiter: {
    ka: "მიმტანის გამოძახება",
    en: "Call waiter",
    ru: "Позвать официанта",
  },
  clean_table: {
    ka: "მაგიდის გადაწმენდა",
    en: "Clean table",
    ru: "Убрать стол",
  },
  bill_card: {
    ka: "ანგარიში - ბარათით",
    en: "Bill — card",
    ru: "Счёт — картой",
  },
  bill_cash: {
    ka: "ანგარიში - ნაღდი ფულით",
    en: "Bill — cash",
    ru: "Счёт — наличными",
  },
  low_rating: {
    ka: "დაბალი შეფასება",
    en: "Low rating",
    ru: "Низкая оценка",
  },
};

export const WAITER_CALL_STYLE: Record<
  WaiterCallType,
  { card: string; icon: string }
> = {
  call_waiter: {
    card: "border-amber-500/45 bg-amber-50 dark:bg-amber-950/35",
    icon: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  },
  clean_table: {
    card: "border-sky-500/45 bg-sky-50 dark:bg-sky-950/35",
    icon: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  },
  bill_card: {
    card: "border-emerald-500/45 bg-emerald-50 dark:bg-emerald-950/35",
    icon: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  },
  bill_cash: {
    card: "border-teal-500/45 bg-teal-50 dark:bg-teal-950/35",
    icon: "bg-teal-500/15 text-teal-800 dark:text-teal-200",
  },
  low_rating: {
    card: "border-red-500/55 bg-red-50 dark:bg-red-950/40",
    icon: "bg-red-500/15 text-red-800 dark:text-red-200",
  },
};
