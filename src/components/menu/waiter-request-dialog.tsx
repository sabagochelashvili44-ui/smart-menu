"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MenuLocale, ui } from "@/lib/menu-copy";
import {
  GUEST_WAITER_CALL_TYPES,
  WAITER_CALL_LABELS,
  WAITER_CALL_STYLE,
  type WaiterCallType,
} from "@/lib/waiter-call-types";
import {
  BanknoteIcon,
  BellIcon,
  BrushCleaningIcon,
  CreditCardIcon,
} from "lucide-react";
import type { ComponentType } from "react";

const ICONS: Record<
  (typeof GUEST_WAITER_CALL_TYPES)[number],
  ComponentType<{ className?: string }>
> = {
  call_waiter: BellIcon,
  clean_table: BrushCleaningIcon,
  bill_card: CreditCardIcon,
  bill_cash: BanknoteIcon,
};

export function WaiterRequestDialog({
  open,
  onOpenChange,
  locale,
  copy,
  sending,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: MenuLocale;
  copy: (typeof ui)[MenuLocale];
  sending: boolean;
  onSelect: (type: WaiterCallType) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.requestTitle}</DialogTitle>
          <DialogDescription>{copy.requestHint}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {GUEST_WAITER_CALL_TYPES.map((type) => {
            const Icon = ICONS[type];
            const style = WAITER_CALL_STYLE[type];
            return (
              <button
                key={type}
                type="button"
                disabled={sending}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-transform active:translate-y-px disabled:opacity-60 ${style.card}`}
                onClick={() => onSelect(type)}
              >
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
                >
                  <Icon className="size-6" />
                </span>
                <span className="text-sm font-semibold leading-snug">
                  {WAITER_CALL_LABELS[type][locale]}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
