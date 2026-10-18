"use client";

import { addAdminTable } from "@/app/admin/actions";
import { useAdminLocale } from "@/components/admin/admin-locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guestTableMenuUrl } from "@/lib/app-url";
import { restaurantPublicKey } from "@/lib/restaurant-brand";
import type { AdminRestaurant, AdminTable } from "@/lib/supabaseAdmin";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

export function QrTables({
  restaurant,
  tables,
}: {
  restaurant: AdminRestaurant;
  tables: AdminTable[];
}) {
  const { t } = useAdminLocale();
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminTable[]>(tables);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setRows(tables);
  }, [tables]);

  const restaurantKey = useMemo(
    () => restaurantPublicKey(restaurant),
    [restaurant],
  );

  useEffect(() => {
    let cancelled = false;

    async function build() {
      const generated: Record<string, string> = {};
      for (const table of rows) {
        const url = guestTableMenuUrl(restaurantKey, table.table_number);
        generated[table.id] = await QRCode.toDataURL(url, {
          margin: 1,
          width: 240,
        });
      }
      if (!cancelled) setCodes(generated);
    }

    void build();
    return () => {
      cancelled = true;
    };
  }, [restaurantKey, rows]);

  const addTable = useCallback(async () => {
    const tableNumber = number.trim();
    if (!tableNumber || pending) return;
    setPending(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic: AdminTable = {
      id: tempId,
      restaurant_id: restaurant.id,
      table_number: tableNumber,
    };
    setRows((current) => [...current, optimistic]);
    setNumber("");
    const result = await addAdminTable(tableNumber);
    setPending(false);
    if (result.error || !result.table) {
      setRows((current) => current.filter((row) => row.id !== tempId));
      setError(result.error ?? t.addTable);
      return;
    }
    setRows((current) =>
      current.map((row) => (row.id === tempId ? result.table! : row)),
    );
    setError(null);
  }, [number, pending, restaurant.id, t.addTable]);

  return (
    <div className="space-y-4">
      <p className="text-sm">
        {t.restaurant}: <span className="font-medium">{restaurant.name}</span>
      </p>
      <div className="flex flex-col gap-2 print:hidden sm:flex-row">
        <Input
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          placeholder={t.tablePlaceholder}
        />
        <Button disabled={pending} onClick={() => void addTable()}>
          {t.addTable}
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          {t.printQr}
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((table) => (
          <div
            key={table.id}
            className="flex flex-col items-center gap-2 rounded-xl border p-4"
          >
            {codes[table.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={codes[table.id]}
                alt={`QR ${table.table_number}`}
                className="size-40"
              />
            ) : null}
            <p className="font-medium">
              {restaurant.name} · {table.table_number}
            </p>
            <p className="text-muted-foreground break-all text-center text-xs">
              {guestTableMenuUrl(restaurantKey, table.table_number)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
