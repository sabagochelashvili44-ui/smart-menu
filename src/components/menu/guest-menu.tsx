"use client";

import { AiWaiterChat } from "@/components/menu/ai-waiter-chat";
import { MenuDisplay } from "@/components/menu/menu-display";
import { OrderTracker } from "@/components/menu/order-tracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LANGS, t } from "@/lib/i18n";
import type {
  Category,
  Dish,
  Lang,
  Mood,
  Order,
  Restaurant,
  Table,
} from "@/types/database";
import { useCallback, useEffect, useMemo, useState } from "react";

const MOODS: Mood[] = [
  "classic",
  "romantic",
  "hungry",
  "healthy",
  "celebrating",
];

type MenuPayload = {
  restaurant: Restaurant;
  categories: Category[];
  dishes: Dish[];
  tables: Table[];
};

export function GuestMenu({
  restaurantId,
  tableId,
}: {
  restaurantId: string;
  tableId: string;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const [mood, setMood] = useState<Mood>("classic");
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  const loadMenu = useCallback(async () => {
    const res = await fetch(`/api/menu/${restaurantId}`);
    if (res.ok) setMenu((await res.json()) as MenuPayload);
  }, [restaurantId]);

  const loadOrders = useCallback(async () => {
    const res = await fetch(
      `/api/orders?restaurantId=${restaurantId}&tableId=${tableId}`,
    );
    if (res.ok) {
      const json = (await res.json()) as { orders: Order[] };
      setOrders(json.orders);
    }
  }, [restaurantId, tableId]);

  useEffect(() => {
    void loadMenu();
    void loadOrders();
  }, [loadMenu, loadOrders]);

  useEffect(() => {
    const id = setInterval(() => void loadOrders(), 3000);
    return () => clearInterval(id);
  }, [loadOrders]);

  const dishesById = useMemo(() => {
    const map = new Map<string, Dish>();
    menu?.dishes.forEach((d) => map.set(d.id, d));
    return map;
  }, [menu]);

  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([dishId, qty]) => {
      const dish = dishesById.get(dishId);
      return dish ? { dish, qty } : null;
    })
    .filter((row): row is { dish: Dish; qty: number } => row !== null);

  const total = cartItems.reduce((sum, row) => sum + row.dish.price * row.qty, 0);

  function placeOrder() {
    if (!cartItems.length) return;
    setCart({});
  }

  async function submitReview() {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        table_id: tableId,
        rating,
        feedback,
      }),
    });
    if (res.ok) {
      setFeedback("");
      setReviewNote(
        rating <= 2
          ? "Kitchen and the AI waiter were notified. Ask the waiter for a recovery offer."
          : "Thank you — the team will see this.",
      );
    }
  }

  if (!menu) {
    return <p className="p-6 text-sm text-muted-foreground">Loading menu…</p>;
  }

  const tableLabel =
    menu.tables?.find((tb) => tb.id === tableId)?.table_number ??
    tableId.replace("table-", "");

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="bg-background min-h-full">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 pb-28 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted-foreground text-sm">
              {menu.restaurant.name} · {t(lang, "table")} {tableLabel}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t(lang, "menu")}
            </h1>
          </div>
          <div className="flex flex-wrap gap-1">
            {LANGS.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={lang === item.id ? "default" : "outline"}
                onClick={() => setLang(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          <span className="text-muted-foreground self-center text-sm">
            {t(lang, "mood")}
          </span>
          {MOODS.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={mood === item ? "secondary" : "ghost"}
              onClick={() => setMood(item)}
            >
              {item}
            </Button>
          ))}
        </div>

        <MenuDisplay
          lang={lang}
          categories={menu.categories}
          dishes={menu.dishes}
          cart={cart}
          onAdd={(id) =>
            setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }))
          }
        />

        <AiWaiterChat
          restaurantId={restaurantId}
          lang={lang}
          mood={mood}
        />

        <OrderTracker lang={lang} orders={orders} />

        <Card>
          <CardHeader>
            <CardTitle>{t(lang, "review")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={rating === n ? "default" : "outline"}
                  onClick={() => setRating(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Service, food, wait time..."
            />
            <Button type="button" onClick={() => void submitReview()}>
              {t(lang, "submitReview")}
            </Button>
            {reviewNote ? (
              <p className="text-sm text-muted-foreground">{reviewNote}</p>
            ) : null}
          </CardContent>
        </Card>
      </main>

      <div className="bg-background/95 fixed inset-x-0 bottom-0 border-t p-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t(lang, "cart")}</p>
            <p className="text-muted-foreground text-xs">
              {cartItems.length
                ? cartItems
                    .map(
                      (row) =>
                        `${row.qty}× ${row.dish.translations[lang]?.name ?? row.dish.translations.en.name}`,
                    )
                    .join(" · ")
                : t(lang, "emptyCart")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {t(lang, "total")} ${total.toFixed(2)}
            </span>
            <Button disabled={!cartItems.length} onClick={() => void placeOrder()}>
              {t(lang, "placeOrder")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
