"use client";

import { Button } from "@/components/ui/button";
import {
  dishLabel,
  formatGel,
  type MenuLocale,
  ui,
} from "@/lib/menu-copy";
import type { CrossSellDish } from "@/lib/cross-sell";
import { PlusIcon } from "lucide-react";
import Image from "next/image";

export function CrossSellSection({
  items,
  locale,
  copy,
  onAdd,
  compact = false,
  heading = "together",
  layout = "cards",
}: {
  items: CrossSellDish[];
  locale: MenuLocale;
  copy: (typeof ui)[MenuLocale];
  onAdd: (dish: CrossSellDish) => void;
  compact?: boolean;
  heading?: "together" | "chef";
  layout?: "cards" | "bar";
}) {
  if (items.length === 0) return null;
  const title = heading === "chef" ? copy.chefTip : copy.boughtTogether;

  if (layout === "bar") {
    return (
      <section className="mt-4 space-y-2 rounded-2xl border border-secondary/30 bg-muted/30 p-3">
        <h3 className="text-sm font-semibold leading-snug text-foreground">
          {title}
        </h3>
        <ul className="space-y-2">
          {items.map((dish) => {
            const src = dish.image_url?.trim() || "";
            const name = dishLabel(dish.name, locale);
            return (
              <li
                key={dish.id}
                className="bg-card flex items-center gap-2 rounded-xl border border-secondary/25 p-2"
              >
                <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-lg">
                  {src ? (
                    <Image
                      src={src}
                      alt=""
                      fill
                      unoptimized
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="from-muted via-muted/70 to-muted/40 absolute inset-0 bg-gradient-to-br"
                      aria-hidden
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium leading-tight">
                    {name}
                  </p>
                  <p className="text-primary text-xs font-semibold tabular-nums">
                    {formatGel(dish.price)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 px-2 text-xs"
                  aria-label={`${copy.addUpsell}: ${name}`}
                  onClick={() => onAdd(dish)}
                >
                  {copy.addUpsell}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <section className={compact ? "space-y-2" : "mt-4 space-y-2"}>
      <h3 className="text-sm font-semibold leading-snug text-foreground">
        {title}
      </h3>
      <ul className="grid grid-cols-3 gap-2">
        {items.map((dish) => {
          const src = dish.image_url?.trim() || "";
          const name = dishLabel(dish.name, locale);
          return (
            <li
              key={dish.id}
              className="bg-card overflow-hidden rounded-xl border border-secondary/35"
            >
              <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden">
                {src ? (
                  <Image
                    src={src}
                    alt=""
                    fill
                    unoptimized
                    sizes="120px"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="from-muted via-muted/70 to-muted/40 absolute inset-0 bg-gradient-to-br"
                    aria-hidden
                  />
                )}
              </div>
              <div className="space-y-1.5 p-2">
                <p className="line-clamp-2 min-h-8 text-[11px] font-medium leading-tight">
                  {name}
                </p>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-primary text-xs font-semibold tabular-nums">
                    {formatGel(dish.price)}
                  </p>
                  <Button
                    type="button"
                    size="icon-xs"
                    className="size-7 shrink-0"
                    aria-label={`${copy.addUpsell}: ${name}`}
                    onClick={() => onAdd(dish)}
                  >
                    <PlusIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
