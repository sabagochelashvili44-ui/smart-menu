"use client";

import { Button } from "@/components/ui/button";
import { MinusIcon, PlusIcon } from "lucide-react";

export function QuantityStepper({
  value,
  onDecrease,
  onIncrease,
  decreaseLabel = "Decrease quantity",
  increaseLabel = "Increase quantity",
  disabledIncrease = false,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel?: string;
  increaseLabel?: string;
  disabledIncrease?: boolean;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-lg border px-1 py-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={decreaseLabel}
        onClick={onDecrease}
      >
        <MinusIcon className="size-4" />
      </Button>
      <span className="min-w-6 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={increaseLabel}
        disabled={disabledIncrease}
        onClick={onIncrease}
      >
        <PlusIcon className="size-4" />
      </Button>
    </div>
  );
}
