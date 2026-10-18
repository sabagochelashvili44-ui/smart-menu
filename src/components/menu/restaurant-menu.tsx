"use client";

import { DishCardImage } from "@/components/guest/dish-card";
import { AiChatbot } from "@/components/menu/ai-chatbot";
import { ChefNavBubble } from "@/components/menu/digital-host-widget";
import { CartDrawer, type CartLine } from "@/components/menu/cart-drawer";
import { CrossSellSection } from "@/components/menu/cross-sell-section";
import { QuantityStepper } from "@/components/menu/quantity-stepper";
import { ServiceFeedbackDialog } from "@/components/menu/service-feedback-dialog";
import { WaiterRequestDialog } from "@/components/menu/waiter-request-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  allergenLabel,
  categoryLabel,
  dishDescription,
  dishLabel,
  formatGel,
  formatGuestTableLabel,
  ingredientLabel,
  type MenuLocale,
  ui,
} from "@/lib/menu-copy";
import { useMenuTranslations } from "@/lib/use-menu-translations";
import { type CrossSellDish } from "@/lib/cross-sell";
import { emptyDietFilter, type DietFilter } from "@/lib/guest-diet";
import {
  localExternalContext,
  pickContextUpsells,
  type ExternalContext,
} from "@/lib/recommendations";
import { looksLikeCulinaryQuestion } from "@/lib/host-query";
import { trackGuestIntent } from "@/lib/guest-intent";
import {
  cartTotals,
  parseServiceFeePercent,
  restaurantGoogleMapsUrl,
  syncServiceFeeLine,
} from "@/lib/service-fee";
import type { WaiterCallType } from "@/lib/waiter-call-types";
import { BellIcon, SearchIcon, SparklesIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type MenuRestaurant = {
  id: string;
  name: string;
  logo: string | null;
  google_review_url?: string | null;
  google_maps_review_url?: string | null;
  service_fee_percent?: number | null;
};

export type MenuTable = {
  id: string;
  table_number: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  order_index: number;
};

export type MenuDish = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  allergens: string[] | null;
  is_available: boolean;
  ingredients?: string[] | null;
  wine_pairing?: string | null;
};

export function RestaurantMenu({
  restaurant,
  table,
  categories,
  dishes,
}: {
  restaurant: MenuRestaurant;
  table: MenuTable | null;
  categories: MenuCategory[];
  dishes: MenuDish[];
}) {
  const [locale, setLocaleState] = useState<MenuLocale>("ka");
  const copy = ui[locale];
  const translationPhrases = useMemo(() => {
    const phrases: string[] = [];
    for (const category of categories) phrases.push(category.name);
    for (const dish of dishes) {
      phrases.push(dish.name);
      if (dish.description) phrases.push(dish.description);
      for (const ingredient of dish.ingredients ?? []) phrases.push(ingredient);
      for (const allergen of dish.allergens ?? []) phrases.push(allergen);
    }
    return phrases;
  }, [categories, dishes]);
  const { translating, translate } = useMenuTranslations(
    locale,
    translationPhrases,
  );
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string | null>(null);
  const clearChatPrompt = useCallback(() => setChatPrompt(null), []);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState(false);
  const [diet, setDiet] = useState<DietFilter>(emptyDietFilter);
  const [context, setContext] = useState<ExternalContext>(localExternalContext);

  useEffect(() => {
    const stored = window.localStorage.getItem("smart-ai-menu-guest-lang");
    if (stored === "ka" || stored === "en" || stored === "ru") {
      setLocaleState(stored);
    }
  }, []);

  function openHost(prompt?: string) {
    const next = prompt?.trim();
    setChatPrompt(next ? next : null);
    setChatOpen(true);
  }

  function setActiveLanguage(next: MenuLocale) {
    setLocaleState(next);
    window.localStorage.setItem("smart-ai-menu-guest-lang", next);
  }

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const fallback = localExternalContext();
    setContext(fallback);
    const controller = new AbortController();
    void fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=41.7151&longitude=44.8271&current=temperature_2m,precipitation",
      { signal: controller.signal },
    )
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as {
          current?: { temperature_2m?: number; precipitation?: number };
        };
        const temperatureC = json.current?.temperature_2m;
        if (typeof temperatureC !== "number") return;
        setContext({
          hour: new Date().getHours(),
          temperatureC,
          rainy: (json.current?.precipitation ?? 0) > 0,
        });
      })
      .catch(() => {
        setContext(localExternalContext());
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!notice || noticeError) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice, noticeError]);

  const categoriesWithDishes = useMemo(
    () =>
      categories.filter((category) =>
        dishes.some((dish) => dish.category_id === category.id),
      ),
    [categories, dishes],
  );

  useEffect(() => {
    if (activeCategory === "all") return;
    if (!categoriesWithDishes.some((category) => category.id === activeCategory)) {
      setActiveCategory("all");
    }
  }, [activeCategory, categoriesWithDishes]);

  const visibleDishes = useMemo(() => {
    const query = searchQuery.trim();
    const pool =
      query || activeCategory === "all"
        ? dishes
        : dishes.filter((dish) => dish.category_id === activeCategory);
    if (!query) return pool;
    return pool.filter((dish) => dishMatchesQuery(dish, query));
  }, [activeCategory, dishes, searchQuery]);

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce(
    (sum, line) => sum + line.quantity * line.price,
    0,
  );
  const totals = cartTotals(
    subtotal,
    parseServiceFeePercent(restaurant.service_fee_percent),
  );
  const total = totals.grandTotal;
  const upsell = useMemo(
    () =>
      pickContextUpsells({
        dishes,
        categories,
        cart: cart.map((line) => ({ id: line.id, quantity: line.quantity })),
        diet,
        context,
        limit: 3,
      }),
    [cart, categories, context, diet, dishes],
  );
  const recommendations = upsell.items;

  function quantityFor(dishId: string) {
    return cart.find((line) => line.id === dishId)?.quantity ?? 0;
  }

  function addToCart(dish: MenuDish) {
    if (!dish.is_available) return;
    trackGuestIntent({
      restaurantId: restaurant.id,
      tableId: table?.id,
      eventType: "cart_add",
      dishId: dish.id,
      dishName: dish.name,
      unitPrice: Number(dish.price),
    });
    changeQuantity(dish.id, 1, dish);
    setLastAddedId(dish.id);
  }

  function addRecommendation(dish: CrossSellDish) {
    const full = dishes.find((item) => item.id === dish.id);
    if (!full) return;
    addToCart(full);
  }

  function changeQuantity(dishId: string, delta: number, dish?: MenuDish) {
    const existing = cart.find((line) => line.id === dishId);
    const nextQuantity = existing ? existing.quantity + delta : delta > 0 ? 1 : 0;
    if (nextQuantity < 1) {
      setLastAddedId((current) => (current === dishId ? null : current));
    }
    setCart((current) => {
      const row = current.find((line) => line.id === dishId);
      if (!row) {
        if (delta <= 0 || !dish) return current;
        return [
          ...current,
          {
            id: dish.id,
            name: dish.name,
            price: Number(dish.price),
            quantity: 1,
          },
        ];
      }

      const quantity = row.quantity + delta;
      if (quantity < 1) {
        return current.filter((line) => line.id !== dishId);
      }

      return current.map((line) =>
        line.id === dishId ? { ...line, quantity } : line,
      );
    });
    setNotice(null);
  }

  function removeFromCart(dishId: string) {
    setCart((current) => current.filter((line) => line.id !== dishId));
    setLastAddedId((current) => (current === dishId ? null : current));
    setNotice(null);
  }

  async function callWaiter(callType: WaiterCallType) {
    if (!table || calling) return;
    setCalling(true);
    setNotice(null);
    try {
      const res = await fetch("/api/waiter-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          table_id: table.id,
          table_number: table.table_number,
          call_type: callType,
          items:
            callType === "call_waiter" ||
            callType === "bill_card" ||
            callType === "bill_cash"
              ? syncServiceFeeLine(
                  cart.map((line) => ({
                    dish_id: line.id,
                    name: line.name,
                    quantity: line.quantity,
                    unit_price: line.price,
                  })),
                  totals.percent,
                  copy.serviceFee(totals.percent),
                )
              : [],
        }),
      });
      const json = (await res.json()) as { call?: { id: string }; error?: string };
      if (!res.ok || !json.call) {
        setNoticeError(true);
        setNotice(json.error ?? copy.callFail);
        return;
      }
      setRequestOpen(false);
      setNoticeError(false);
      setNotice(copy.requestSent);
      if (callType === "bill_card" || callType === "bill_cash") {
        setFeedbackOpen(true);
      }
    } catch {
      setNoticeError(true);
      setNotice(copy.callFail);
    } finally {
      setCalling(false);
    }
  }

  return (
    <div className="bg-background flex min-h-full flex-col pb-40">
      <header className="bg-background/95 sticky top-0 z-20 border-b border-secondary/30 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {restaurant.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.logo}
              alt=""
              className="size-12 rounded-full object-cover ring-1 ring-foreground/10"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full text-lg font-semibold">
              {restaurant.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {restaurant.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {formatGuestTableLabel(copy.table, table?.table_number)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1" role="group" aria-label={copy.language}>
            {(["ka", "en", "ru"] as const).map((code) => (
              <Button
                key={code}
                type="button"
                size="sm"
                variant={locale === code ? "default" : "outline"}
                className="min-w-9 px-2"
                onClick={() => setActiveLanguage(code)}
              >
                {code.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {dishes.length > 0 ? (
      <div className="bg-background/95 sticky top-[4.75rem] z-10 border-b border-secondary/30 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg flex-col gap-3">
          <label className="relative block">
            <span className="sr-only">{copy.searchAria}</span>
            <SearchIcon
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                if (!looksLikeCulinaryQuestion(searchQuery)) return;
                event.preventDefault();
                openHost(searchQuery);
              }}
              placeholder={copy.searchPlaceholder}
              autoComplete="off"
              enterKeyHint="search"
              className="h-11 rounded-xl border-primary/15 bg-muted/40 pr-20 pl-10 text-sm md:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            <span className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-0.5">
              {looksLikeCulinaryQuestion(searchQuery) ? (
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-full text-[#8b5a1a]"
                  onClick={() => openHost(searchQuery)}
                  aria-label={copy.hostAskCta}
                >
                  <SparklesIcon className="size-4" />
                </button>
              ) : null}
              {searchQuery ? (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-full"
                  onClick={() => setSearchQuery("")}
                  aria-label={copy.searchClear}
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </span>
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterChip
              label={copy.all}
              active={Boolean(searchQuery.trim()) || activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
            />
            {categoriesWithDishes.map((category) => (
              <FilterChip
                key={category.id}
                label={translate(category.name)}
                active={activeCategory === category.id && !searchQuery.trim()}
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory(category.id);
                }}
              />
            ))}
          </div>
          {looksLikeCulinaryQuestion(searchQuery) ? (
            <button
              type="button"
              onClick={() => openHost(searchQuery)}
              className="text-left text-xs font-medium tracking-wide text-[#8b5a1a]"
            >
              {copy.hostAskCta}
            </button>
          ) : null}
        </div>
      </div>
      ) : null}

      {translating && locale !== "ka" ? (
        <p className="text-muted-foreground mx-auto w-full max-w-lg px-4 pt-3 text-center text-xs">
          {copy.translatingMenu}
        </p>
      ) : null}

      <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-3 pb-28">
        {visibleDishes.length === 0 ? (
          searchQuery.trim() ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-muted-foreground text-sm">{copy.searchEmpty}</p>
              {looksLikeCulinaryQuestion(searchQuery) ? (
                <Button
                  type="button"
                  size="sm"
                  className="host-gradient host-glow rounded-2xl"
                  onClick={() => openHost(searchQuery)}
                >
                  {copy.hostAskCta}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                >
                  {copy.searchClear}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground py-12 text-center text-sm">
              {dishes.length === 0 ? copy.menuEmpty : copy.emptyCategory}
            </p>
          )
        ) : (
          visibleDishes.map((dish) => (
            <DishIntentCard
              key={dish.id}
              restaurantId={restaurant.id}
              tableId={table?.id}
              dish={dish}
            >
              <article
                data-locale={locale}
                data-tx={locale}
                className="bg-card overflow-hidden rounded-2xl border border-secondary/35 shadow-[0_1px_0_rgba(45,0,0,0.04)]"
              >
              <DishCardImage
                src={dish.image_url}
                alt={translate(dish.name)}
              />
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-medium leading-snug text-foreground">
                    {translate(dish.name)}
                  </h2>
                  <p className="text-primary shrink-0 text-base font-semibold tabular-nums">
                    {formatGel(dish.price)}
                  </p>
                </div>
                {dish.description ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {dishDescription(dish.name, dish.description, locale) ||
                      translate(dish.description)}
                  </p>
                ) : null}
                {(dish.ingredients ?? []).length > 0 ? (
                  <p className="text-sm leading-relaxed">
                    <span className="text-foreground font-medium">
                      {copy.ingredients}:{" "}
                    </span>
                    <span className="text-muted-foreground">
                      {(dish.ingredients ?? [])
                        .map((item) => translate(item))
                        .join(", ")}
                    </span>
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  {!dish.is_available ? (
                    <Badge variant="destructive">{copy.unavailable}</Badge>
                  ) : null}
                  {(dish.allergens ?? []).map((allergen) => (
                    <Badge key={allergen} variant="secondary">
                      {translate(allergen)}
                    </Badge>
                  ))}
                </div>
                {dish.is_available && quantityFor(dish.id) > 0 ? (
                  <QuantityStepper
                    value={quantityFor(dish.id)}
                    onDecrease={() => changeQuantity(dish.id, -1)}
                    onIncrease={() => {
                      trackGuestIntent({
                        restaurantId: restaurant.id,
                        tableId: table?.id,
                        eventType: "cart_add",
                        dishId: dish.id,
                        dishName: dish.name,
                        unitPrice: Number(dish.price),
                      });
                      changeQuantity(dish.id, 1, dish);
                    }}
                    decreaseLabel={copy.decreaseQty}
                    increaseLabel={copy.increaseQty}
                  />
                ) : (
                  <Button
                    type="button"
                    className="w-full"
                    disabled={!dish.is_available}
                    onClick={() => addToCart(dish)}
                  >
                    {dish.is_available ? copy.addToCart : copy.soldOut}
                  </Button>
                )}
              </div>
            </article>
              {lastAddedId === dish.id && recommendations.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-secondary/30 bg-muted/40 p-3">
                  <CrossSellSection
                    compact
                    heading={upsell.heading}
                    items={recommendations}
                    locale={locale}
                    copy={copy}
                    onAdd={addRecommendation}
                  />
                </div>
              ) : null}
            </DishIntentCard>
          ))
        )}
      </main>

      {notice ? (
        <div
          className={
            noticeError
              ? "border-destructive/30 bg-background text-destructive fixed inset-x-4 bottom-36 z-30 mx-auto max-w-lg rounded-xl border px-4 py-3 text-sm shadow-lg"
              : "bg-background fixed inset-x-4 bottom-36 z-30 mx-auto max-w-lg rounded-xl border border-emerald-500/30 px-4 py-3 text-sm text-emerald-800 shadow-lg"
          }
        >
          {notice}
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20">
        <div className="mx-auto flex max-w-md flex-col gap-2 rounded-t-3xl border-t bg-[#FAF6F0] p-3 shadow-2xl">
          <button
            type="button"
            className="flex items-start justify-between gap-3 text-left"
            onClick={() => setCartOpen(true)}
          >
            <span className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">
                {itemCount === 0 ? copy.cartEmpty : copy.items(itemCount)}
              </p>
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {cart.length
                  ? cart
                      .map(
                        (line) =>
                          `${line.quantity}× ${translate(line.name)}`,
                      )
                      .join(" · ")
                  : copy.cartHint}
              </p>
            </span>
            <p className="text-primary shrink-0 self-center text-base font-semibold tabular-nums">
              {formatGel(total)}
            </p>
          </button>
          <ChefNavBubble
            text={copy.chefWidgetBubble}
            chatOpen={chatOpen}
            onOpen={() => openHost()}
          />
          <div className="grid w-full grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openHost()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#D4AF37] bg-[#FAF6F0] py-3 text-[#5A121A] shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/chef-icon.png"
                alt="შეფ-ასისტენტი"
                className="h-8 w-8 object-contain"
              />
              <span className="min-w-0 truncate text-xs font-bold">
                {copy.chefAssistant}
              </span>
            </button>
            <button
              type="button"
              disabled={!table || calling}
              onClick={() => setRequestOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5A121A] py-3 text-white shadow-sm disabled:opacity-60"
            >
              <BellIcon className="size-4 shrink-0" />
              <span className="min-w-0 truncate text-xs font-bold">
                {calling ? copy.sending : copy.callWaiter}
              </span>
            </button>
          </div>
        </div>
      </div>

      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        total={total}
        totals={totals}
        tableLabel={
          table ? formatGuestTableLabel(copy.table, table.table_number) : copy.noTable
        }
        copy={copy}
        locale={locale}
        calling={calling}
        canCall={Boolean(table)}
        onIncrease={(id) => changeQuantity(id, 1)}
        onDecrease={(id) => changeQuantity(id, -1)}
        onRemove={removeFromCart}
        onCallWaiter={() => setRequestOpen(true)}
        recommendations={recommendations}
        recommendationHeading={upsell.heading}
        onAddRecommendation={addRecommendation}
      />

      <WaiterRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        locale={locale}
        copy={copy}
        sending={calling}
        onSelect={(type) => void callWaiter(type)}
      />

      {table ? (
        <ServiceFeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          restaurantId={restaurant.id}
          tableId={table.id}
          tableNumber={table.table_number}
          googleReviewUrl={restaurantGoogleMapsUrl(restaurant)}
          locale={locale}
        />
      ) : null}

      <AiChatbot
        open={chatOpen}
        onOpenChange={setChatOpen}
        onDietChange={setDiet}
        restaurantName={restaurant.name}
        dishes={dishes.map((dish) => ({
          ...dish,
          category:
            categories.find((category) => category.id === dish.category_id)
              ?.name ?? "",
        }))}
        locale={locale}
        pendingPrompt={chatPrompt}
        onPendingPromptConsumed={clearChatPrompt}
      />
    </div>
  );
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function dishMatchesQuery(dish: MenuDish, query: string) {
  const needle = normalizeSearch(query);
  if (!needle) return true;

  const fields = [
    dish.name,
    dish.description,
    dishLabel(dish.name, "ka"),
    dishLabel(dish.name, "en"),
    dishLabel(dish.name, "ru"),
    dishDescription(dish.name, dish.description, "ka"),
    dishDescription(dish.name, dish.description, "en"),
    dishDescription(dish.name, dish.description, "ru"),
    ...(dish.ingredients ?? []),
    ...(dish.ingredients ?? []).map((item) => ingredientLabel(item, "en")),
    ...(dish.ingredients ?? []).map((item) => ingredientLabel(item, "ru")),
  ];

  return fields.some((field) => normalizeSearch(field ?? "").includes(needle));
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className="shrink-0"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function DishIntentCard({
  restaurantId,
  tableId,
  dish,
  children,
}: {
  restaurantId: string;
  tableId?: string;
  dish: MenuDish;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        trackGuestIntent({
          restaurantId,
          tableId,
          eventType: "view",
          dishId: dish.id,
          dishName: dish.name,
          unitPrice: Number(dish.price),
        });
        observer.disconnect();
      },
      { threshold: 0.55 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [dish.id, dish.name, dish.price, restaurantId, tableId]);

  return <div ref={ref}>{children}</div>;
}
