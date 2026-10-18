"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import type { Lang, Order } from "@/types/database";

function elapsed(iso: string) {
  const mins = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
  );
  return `${mins}m`;
}

export function OrderTracker({
  lang,
  orders,
}: {
  lang: Lang;
  orders: Order[];
}) {
  const live = orders.filter(
    (order) => order.status !== "served" && order.status !== "cancelled",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(lang, "tracker")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {live.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Place an order to start the kitchen timer.
          </p>
        ) : (
          live.map((order) => (
            <div key={order.id} className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge>{order.status}</Badge>
                  <span className="text-muted-foreground text-xs">
                    {t(lang, "kitchenTimer")} {elapsed(order.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm">
                  {order.items
                    .map((item) => `${item.quantity}× ${item.name}`)
                    .join(", ")}
                </p>
              </div>
              <span className="text-sm font-medium">
                ${order.total_amount.toFixed(2)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
