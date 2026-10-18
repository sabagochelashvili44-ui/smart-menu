"use client";

import type { WaiterCallAlert } from "@/app/admin/actions";
import { useAdminLocale } from "@/components/admin/admin-locale";
import {
  OrderEditDialog,
  type KitchenMenuDish,
} from "@/components/admin/order-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dishLabel, formatGel } from "@/lib/menu-copy";
import {
  isServiceFeeItem,
  syncServiceFeeLine,
  ticketPriceBreakdown,
} from "@/lib/service-fee";
import { waiterCallItemsTotal } from "@/lib/waiter-call-items";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  parseWaiterCallType,
  WAITER_CALL_LABELS,
  WAITER_CALL_STYLE,
  type WaiterCallType,
} from "@/lib/waiter-call-types";
import {
  AlertTriangleIcon,
  BanknoteIcon,
  BellIcon,
  BrushCleaningIcon,
  CreditCardIcon,
} from "lucide-react";
import type { WaiterCallLine } from "@/lib/waiter-call-items";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CHIME_URL =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

type KitchenAudioContext = AudioContext;

function getAudioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

function playSynthesizedChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.45, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  master.connect(ctx.destination);

  const tones = [880, 1174, 988];
  tones.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + index * 0.12;
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

function normalizeKitchenStatus(raw: string | null | undefined) {
  const status = String(raw ?? "").trim().toLowerCase();
  if (
    status === "acknowledged" ||
    status === "accepted" ||
    status === "completed" ||
    status === "ready" ||
    status === "served"
  ) {
    return "acknowledged";
  }
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "preparing" || status === "pending") return status;
  if (!status) return "";
  return "open";
}

function isIncomingCallStatus(status: string) {
  return status === "open" || status === "pending";
}

function isPendingKitchenStatus(status: string) {
  return (
    status === "open" || status === "pending" || status === "preparing"
  );
}

function isAcknowledgedKitchenStatus(status: string) {
  return normalizeKitchenStatus(status) === "acknowledged";
}

function shouldShowOrderTotal(call: WaiterCallAlert) {
  if (call.call_type === "low_rating") return false;
  if (!call.items.length) return false;
  return waiterCallItemsTotal(call.items) > 0;
}

function KitchenTicketTotals({
  items,
  fallbackPercent,
  dishesLabel,
  serviceLabel,
  dueLabel,
  totalLabel,
}: {
  items: WaiterCallAlert["items"];
  fallbackPercent: number;
  dishesLabel: string;
  serviceLabel: string;
  dueLabel: string;
  totalLabel: string;
}) {
  const breakdown = ticketPriceBreakdown(items, fallbackPercent);
  if (breakdown.percent > 0 && breakdown.serviceFee > 0) {
    return (
      <div className="mt-2 space-y-1 border-t pt-2 text-sm text-[#5A121A]">
        <p className="flex items-center justify-between">
          <span>{dishesLabel}:</span>
          <span className="tabular-nums">{formatGel(breakdown.subtotal)}</span>
        </p>
        <p className="flex items-center justify-between">
          <span>
            {serviceLabel} ({breakdown.percent}%):
          </span>
          <span className="tabular-nums">{formatGel(breakdown.serviceFee)}</span>
        </p>
        <p className="flex items-center justify-between font-bold">
          <span>{dueLabel}:</span>
          <span className="tabular-nums">{formatGel(breakdown.grandTotal)}</span>
        </p>
      </div>
    );
  }
  return (
    <p className="mt-2 flex items-center justify-between border-t pt-2 text-sm font-bold text-[#5A121A]">
      <span>{totalLabel}:</span>
      <span className="tabular-nums">{formatGel(breakdown.grandTotal)}</span>
    </p>
  );
}

function elapsed(iso: string, unit: string) {
  const mins = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
  );
  return `${mins}${unit}`;
}

function parseItems(raw: unknown): WaiterCallAlert["items"] {
  if (typeof raw === "string") {
    try {
      return parseItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        dish_id: String(row.dish_id ?? ""),
        name: String(row.name ?? "Item"),
        quantity: Number(row.quantity) || 0,
        unit_price: Number(row.unit_price) || 0,
      };
    })
    .filter((item) => item.quantity > 0);
}

function toWaiterCall(
  row: Record<string, unknown>,
  existing?: WaiterCallAlert,
): WaiterCallAlert {
  const statusRaw = row.status;
  const status =
    statusRaw === undefined || statusRaw === null || statusRaw === ""
      ? existing?.status ?? "open"
      : normalizeKitchenStatus(String(statusRaw)) ||
        existing?.status ||
        "open";

  return {
    id: String(row.id ?? existing?.id ?? ""),
    restaurant_id: String(row.restaurant_id ?? existing?.restaurant_id ?? ""),
    table_id: String(row.table_id ?? existing?.table_id ?? ""),
    table_number: String(row.table_number ?? existing?.table_number ?? ""),
    items: row.items === undefined ? existing?.items ?? [] : parseItems(row.items),
    status,
    call_type:
      row.call_type === undefined
        ? (existing?.call_type ?? parseWaiterCallType(undefined))
        : parseWaiterCallType(row.call_type),
    created_at: String(row.created_at ?? existing?.created_at ?? ""),
  };
}

function kitchenStatusFromOrder(status: string) {
  const normalized = normalizeKitchenStatus(status);
  if (normalized === "cancelled" || normalized === "acknowledged") {
    return normalized;
  }
  if (status === "pending" || status === "preparing") return status;
  return "open";
}

function toKitchenCallFromOrder(
  row: Record<string, unknown>,
  existing?: WaiterCallAlert,
): WaiterCallAlert {
  const statusRaw = row.status;
  const status =
    statusRaw === undefined || statusRaw === null || statusRaw === ""
      ? existing?.status ?? "open"
      : kitchenStatusFromOrder(String(statusRaw));

  return {
    id: String(row.id ?? existing?.id ?? ""),
    restaurant_id: String(row.restaurant_id ?? existing?.restaurant_id ?? ""),
    table_id: String(row.table_id ?? existing?.table_id ?? ""),
    table_number: String(row.table_number ?? existing?.table_number ?? ""),
    items: row.items === undefined ? existing?.items ?? [] : parseItems(row.items),
    status,
    call_type: existing?.call_type ?? null,
    created_at: String(row.created_at ?? existing?.created_at ?? ""),
  };
}

const CALL_ICONS: Record<
  WaiterCallType,
  ComponentType<{ className?: string }>
> = {
  call_waiter: BellIcon,
  clean_table: BrushCleaningIcon,
  bill_card: CreditCardIcon,
  bill_cash: BanknoteIcon,
  low_rating: AlertTriangleIcon,
};

function CallTypeRow({
  type,
  locale,
}: {
  type: WaiterCallType;
  locale: "ka" | "en" | "ru";
}) {
  const Icon = CALL_ICONS[type];
  return (
    <div className="mb-2 flex items-center gap-2">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${WAITER_CALL_STYLE[type].icon}`}
      >
        <Icon className="size-4" />
      </span>
      <p className="text-sm font-semibold leading-snug">
        {WAITER_CALL_LABELS[type][locale]}
      </p>
    </div>
  );
}

function upsertCall(current: WaiterCallAlert[], call: WaiterCallAlert) {
  if (call.status === "cancelled") {
    return current.filter((row) => row.id !== call.id);
  }
  if (current.some((row) => row.id === call.id)) {
    return current.map((row) => (row.id === call.id ? call : row));
  }
  return [call, ...current];
}

function applyKitchenRow(
  current: WaiterCallAlert[],
  table: "waiter_calls" | "orders",
  row: Record<string, unknown> | undefined,
) {
  if (!row?.id) return current;
  const existing = current.find((item) => item.id === String(row.id));
  const call =
    table === "orders"
      ? toKitchenCallFromOrder(row, existing)
      : toWaiterCall(row, existing);
  return upsertCall(current, call);
}

export function KitchenBoard({
  restaurantId,
  initialCalls,
  dishes = [],
  serviceFeePercent = 0,
}: {
  restaurantId: string;
  initialCalls: WaiterCallAlert[];
  dishes?: KitchenMenuDish[];
  serviceFeePercent?: number;
}) {
  const { locale, t } = useAdminLocale();
  const [calls, setCalls] = useState<WaiterCallAlert[]>(initialCalls);
  const [tab, setTab] = useState<"pending" | "acknowledged">("pending");
  const [editingCall, setEditingCall] = useState<WaiterCallAlert | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const soundOnRef = useRef(false);
  const chimeRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<KitchenAudioContext | null>(null);

  useEffect(() => {
    setCalls(initialCalls);
    // Only reset when switching restaurants so Realtime patches are not wiped
    // by a stale Server Component snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restaurant-scoped seed
  }, [restaurantId]);

  const ensureAudioContext = useCallback(async () => {
    const Ctor = getAudioContextConstructor();
    if (!Ctor) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new Ctor();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx;
  }, []);

  const playChime = useCallback(async () => {
    if (!soundOnRef.current) return;

    const ctx = await ensureAudioContext();
    const audio = chimeRef.current;
    let htmlPlayed = false;

    if (audio && !audio.error) {
      audio.volume = 1.0;
      try {
        audio.pause();
        audio.currentTime = 0;
        await audio.play();
        htmlPlayed = true;
      } catch (err) {
        console.error(err);
      }
    }

    if (!htmlPlayed && ctx) {
      playSynthesizedChime(ctx);
    }
  }, [ensureAudioContext]);

  async function toggleSound() {
    if (soundOn) {
      soundOnRef.current = false;
      setSoundOn(false);
      const audio = chimeRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      return;
    }

    const ctx = await ensureAudioContext();
    const audio = chimeRef.current;
    if (audio) {
      audio.volume = 1.0;
      try {
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
      } catch (err) {
        console.error(err);
      }
    }

    if (ctx) {
      playSynthesizedChime(ctx);
    }

    soundOnRef.current = true;
    setSoundOn(true);
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const tenantFilter = `restaurant_id=eq.${restaurantId}`;

    const onWaiterChange = (payload: {
      eventType?: string;
      new?: Record<string, unknown>;
      old?: Record<string, unknown>;
    }) => {
      if (payload.eventType === "DELETE") {
        const id = String(payload.old?.id ?? "");
        if (!id) return;
        setCalls((current) => current.filter((row) => row.id !== id));
        return;
      }
      const row = payload.new;
      if (!row) return;
      const incoming = toWaiterCall(row);
      setCalls((current) => applyKitchenRow(current, "waiter_calls", row));
      if (
        payload.eventType === "INSERT" &&
        isIncomingCallStatus(incoming.status) &&
        (soundOnRef.current || incoming.call_type === "low_rating")
      ) {
        void playChime();
      }
    };

    const onOrderChange = (payload: {
      eventType?: string;
      new?: Record<string, unknown>;
      old?: Record<string, unknown>;
    }) => {
      if (payload.eventType === "DELETE") {
        const id = String(payload.old?.id ?? "");
        if (!id) return;
        setCalls((current) => current.filter((row) => row.id !== id));
        return;
      }
      const row = payload.new;
      if (!row) return;
      const incoming = toKitchenCallFromOrder(row);
      setCalls((current) => applyKitchenRow(current, "orders", row));
      if (
        payload.eventType === "INSERT" &&
        isIncomingCallStatus(incoming.status) &&
        soundOnRef.current
      ) {
        void playChime();
      }
    };

    const channel = supabase
      .channel(`kitchen-live-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "waiter_calls",
          filter: tenantFilter,
        },
        onWaiterChange,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "waiter_calls",
          filter: tenantFilter,
        },
        onWaiterChange,
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "waiter_calls",
          filter: tenantFilter,
        },
        onWaiterChange,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: tenantFilter,
        },
        onOrderChange,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: tenantFilter,
        },
        onOrderChange,
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "orders",
          filter: tenantFilter,
        },
        onOrderChange,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [playChime, restaurantId]);

  async function acknowledgeCall(id: string) {
    const previous = calls.find((call) => call.id === id);
    setCalls((current) =>
      current.map((call) =>
        call.id === id ? { ...call, status: "acknowledged" } : call,
      ),
    );
    try {
      const response = await fetch(`/api/waiter-calls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "acknowledged" }),
      });
      const json = (await response.json().catch(() => null)) as {
        call?: Record<string, unknown>;
        error?: string;
      } | null;
      if (!response.ok) {
        if (previous) {
          setCalls((current) =>
            current.map((call) => (call.id === id ? previous : call)),
          );
        }
        return;
      }
      const updatedCall = json?.call;
      if (updatedCall) {
        setCalls((current) =>
          applyKitchenRow(current, "waiter_calls", {
            ...updatedCall,
            status: updatedCall.status ?? "acknowledged",
          }),
        );
      }
    } catch {
      if (previous) {
        setCalls((current) =>
          current.map((call) => (call.id === id ? previous : call)),
        );
      }
    }
  }

  async function cancelCall(id: string) {
    setCalls((current) => current.filter((call) => call.id !== id));
    if (editingCall?.id === id) setEditingCall(null);
    await fetch(`/api/waiter-calls/${id}`, { method: "DELETE" });
  }

  async function saveEditedItems(items: WaiterCallLine[]) {
    if (!editingCall) return t.orderUpdateFailed;
    const id = editingCall.id;
    const previous = editingCall.items;
    const nextItems = syncServiceFeeLine(
      items,
      serviceFeePercent,
      `${t.serviceFee} (${serviceFeePercent}%)`,
    );
    setCalls((current) =>
      current.map((call) =>
        call.id === id ? { ...call, items: nextItems } : call,
      ),
    );
    const response = await fetch(`/api/waiter-calls/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: nextItems }),
    });
    if (!response.ok) {
      setCalls((current) =>
        current.map((call) =>
          call.id === id ? { ...call, items: previous } : call,
        ),
      );
      return t.orderUpdateFailed;
    }
    return null;
  }

  async function clearAcknowledgedHistory() {
    setCalls((current) =>
      current.filter((call) => !isAcknowledgedKitchenStatus(call.status)),
    );
    await fetch(
      `/api/waiter-calls?restaurantId=${restaurantId}&status=acknowledged`,
      { method: "DELETE" },
    );
  }

  const pending = useMemo(
    () => calls.filter((call) => isPendingKitchenStatus(call.status)),
    [calls],
  );
  const acknowledged = useMemo(
    () => calls.filter((call) => isAcknowledgedKitchenStatus(call.status)),
    [calls],
  );
  const visible = tab === "pending" ? pending : acknowledged;

  return (
    <div className="space-y-3">
      <audio ref={chimeRef} src={CHIME_URL} preload="auto" className="hidden" />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant={soundOn ? "default" : "outline"}
          className="gap-1.5"
          aria-pressed={soundOn}
          onClick={() => void toggleSound()}
        >
          {soundOn ? t.soundActive : t.enableSound}
        </Button>
      </div>

      <section className="rounded-xl border p-3">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <BellIcon className="size-4" />
          {t.waiterCalls}
        </h3>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "pending" ? "default" : "outline"}
            onClick={() => setTab("pending")}
          >
            {t.pendingCalls}
            {pending.length ? ` (${pending.length})` : ""}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "acknowledged" ? "default" : "outline"}
            onClick={() => setTab("acknowledged")}
          >
            {t.acknowledgedCalls}
            {acknowledged.length ? ` (${acknowledged.length})` : ""}
          </Button>
        </div>

        {tab === "acknowledged" ? (
          <div className="mb-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={acknowledged.length === 0}
              onClick={() => void clearAcknowledgedHistory()}
            >
              {t.clearCallHistory}
            </Button>
          </div>
        ) : null}

        {visible.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {tab === "pending" ? t.noWaiterCalls : t.noAcknowledgedCalls}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((call) => (
              <article
                key={call.id}
                className={
                  isPendingKitchenStatus(call.status)
                    ? `rounded-lg border p-3 ${
                        call.call_type
                          ? WAITER_CALL_STYLE[call.call_type].card
                          : "border-amber-500/40 bg-amber-50 dark:bg-amber-950/30"
                      }`
                    : "bg-muted/40 rounded-lg border p-3"
                }
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge>{call.table_number || call.table_id.slice(0, 8)}</Badge>
                  <span className="text-muted-foreground text-xs">
                    {elapsed(call.created_at, t.minutes)}
                  </span>
                </div>
                {call.call_type ? (
                  <CallTypeRow type={call.call_type} locale={locale} />
                ) : null}
                {call.items.length ? (
                  <ul className="mb-2 text-sm">
                    {call.items
                      .filter((item) => !isServiceFeeItem(item))
                      .map((item, index) => (
                      <li key={`${call.id}-${item.dish_id}-${index}`}>
                        {call.call_type === "low_rating"
                          ? item.name
                          : `${item.quantity}× ${dishLabel(item.name, locale)}`}
                      </li>
                    ))}
                  </ul>
                ) : call.call_type ? null : (
                  <Badge variant="secondary" className="mb-2">
                    {t.emptyWaiterCall}
                  </Badge>
                )}
                {shouldShowOrderTotal(call) ? (
                  <KitchenTicketTotals
                    items={call.items}
                    fallbackPercent={serviceFeePercent}
                    dishesLabel={t.dishesSubtotal}
                    serviceLabel={t.serviceFee}
                    dueLabel={t.grandTotalDue}
                    totalLabel={t.kitchenOrderTotal}
                  />
                ) : null}
                {isPendingKitchenStatus(call.status) ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="min-w-0 flex-1"
                      onClick={() => void acknowledgeCall(call.id)}
                    >
                      {t.acknowledge}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-w-0 flex-1"
                      onClick={() => setEditingCall(call)}
                    >
                      {t.editOrder}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10 min-w-0 flex-1"
                      onClick={() => void cancelCall(call.id)}
                    >
                      {t.cancel}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-muted-foreground text-xs">{t.acknowledge}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingCall(call)}
                    >
                      {t.editOrder}
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <OrderEditDialog
        call={editingCall}
        dishes={dishes}
        serviceFeePercent={serviceFeePercent}
        onClose={() => setEditingCall(null)}
        onSave={saveEditedItems}
      />
    </div>
  );
}
