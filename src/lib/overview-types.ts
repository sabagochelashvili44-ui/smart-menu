export type OverviewHourBucket = {
  hour: number;
  label: string;
  orders: number;
  isPeak: boolean;
};

export type OverviewCategoryShare = {
  category: string;
  revenue: number;
  percent: number;
};

export type OverviewSnapshot = {
  revenue: number;
  orderCount: number;
  pendingCalls: number;
  aov: number;
  hourly: OverviewHourBucket[];
  categories: OverviewCategoryShare[];
  topToday: { id: string; name: string; qty: number }[];
  window: string;
};

export function emptyOverviewSnapshot(): OverviewSnapshot {
  return {
    revenue: 0,
    orderCount: 0,
    pendingCalls: 0,
    aov: 0,
    hourly: [],
    categories: [],
    topToday: [],
    window: "today",
  };
}
