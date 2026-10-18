"use client";

import { CrossSellSection } from "@/components/menu/cross-sell-section";
import { QuantityStepper } from "@/components/menu/quantity-stepper";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CrossSellDish } from "@/lib/cross-sell";
import type { UpsellHeading } from "@/lib/recommendations";
import { dishLabel, formatGel, type MenuLocale, ui } from "@/lib/menu-copy";
import type { CartTotals } from "@/lib/service-fee";
import { BellIcon, Trash2Icon } from "lucide-react";

export type CartLine = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export function CartDrawer({
  open,
  onOpenChange,
  cart,
  total,
  totals,
  tableLabel,
  copy,
  locale,
  calling,
  canCall,
  onIncrease,
  onDecrease,
  onRemove,
  onCallWaiter,
  recommendations,
  recommendationHeading = "together",
  onAddRecommendation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartLine[];
  total: number;
  totals?: CartTotals;
  tableLabel: string;
  copy: (typeof ui)[MenuLocale];
  locale: MenuLocale;
  calling: boolean;
  canCall: boolean;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
  onCallWaiter: () => void;
  recommendations: CrossSellDish[];
  recommendationHeading?: UpsellHeading;
  onAddRecommendation: (dish: CrossSellDish) => void;
}) {
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[88dvh] max-h-[88dvh] gap-0 rounded-t-2xl p-0 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[min(40rem,88dvh)] sm:max-w-md sm:rounded-2xl sm:border"
      >
        <SheetHeader className="border-b">
          <SheetTitle>{copy.yourOrder}</SheetTitle>
          <SheetDescription>
            {itemCount === 0
              ? copy.addFromMenu
              : `${copy.items(itemCount)} · ${tableLabel}`}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
            {copy.summaryHint}
          </p>
          {cart.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {copy.cartEmptyLong}
            </p>
          ) : (
            <ul className="space-y-3">
              {cart.map((line) => (
                <li
                  key={line.id}
                  className="flex items-start gap-3 rounded-xl border border-secondary/35 bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">
                      {dishLabel(line.name, locale)}
                    </p>
                    <p className="text-primary text-sm tabular-nums">
                      {formatGel(line.price)} {copy.each} ·{" "}
                      {formatGel(line.price * line.quantity)}
                    </p>
                    <div className="mt-2 max-w-40">
                      <QuantityStepper
                        value={line.quantity}
                        onDecrease={() => onDecrease(line.id)}
                        onIncrease={() => onIncrease(line.id)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`${copy.remove} ${dishLabel(line.name, locale)}`}
                    onClick={() => onRemove(line.id)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {cart.length > 0 ? (
            <CrossSellSection
              layout="bar"
              heading={recommendationHeading}
              items={recommendations}
              locale={locale}
              copy={copy}
              onAdd={onAddRecommendation}
            />
          ) : null}
        </div>

        <SheetFooter className="border-t border-secondary/30">
          {totals && totals.percent > 0 ? (
            <div className="w-full space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span>{copy.dishesSubtotal}</span>
                <span className="tabular-nums">{formatGel(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{copy.serviceFee(totals.percent)}</span>
                <span className="tabular-nums">
                  {formatGel(totals.serviceFee)}
                </span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span>{copy.grandTotalDue}</span>
                <span className="text-primary tabular-nums">
                  {formatGel(totals.grandTotal)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between text-sm font-medium">
              <span>{copy.total}</span>
              <span className="text-primary tabular-nums">{formatGel(total)}</span>
            </div>
          )}
          <Button
            type="button"
            className="h-11 w-full gap-2"
            disabled={!canCall || calling}
            onClick={onCallWaiter}
          >
            <BellIcon className="size-4" />
            {calling ? copy.sending : copy.callWaiter}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
