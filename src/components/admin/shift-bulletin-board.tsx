"use client";

import { useAdminLocale } from "@/components/admin/admin-locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toShiftNote, type ShiftNote } from "@/lib/shift-notes";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ClipboardListIcon, PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function relativeTime(
  iso: string,
  t: { minutes: string; hoursShort: string; daysShort: string; justNow: string },
) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 1) return t.justNow;
  if (mins < 60) return `${mins}${t.minutes}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t.hoursShort}`;
  return `${Math.floor(hours / 24)}${t.daysShort}`;
}

export function ShiftBulletinBoard({
  restaurantId,
  initialNotes,
  canCompose,
}: {
  restaurantId: string;
  initialNotes: ShiftNote[];
  canCompose: boolean;
}) {
  const { t } = useAdminLocale();
  const [notes, setNotes] = useState<ShiftNote[]>(initialNotes);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNotes(initialNotes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restaurant-scoped seed
  }, [restaurantId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`shift-notes-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shift_notes",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: {
          eventType?: string;
          new?: Record<string, unknown>;
          old?: Record<string, unknown>;
        }) => {
          if (payload.eventType === "DELETE") {
            const id = String(payload.old?.id ?? "");
            if (!id) return;
            setNotes((current) => current.filter((note) => note.id !== id));
            return;
          }
          const row = payload.new;
          if (!row?.id) return;
          if (row.is_active === false) {
            setNotes((current) =>
              current.filter((note) => note.id !== String(row.id)),
            );
            return;
          }
          const incoming = toShiftNote(row);
          setNotes((current) => {
            if (current.some((note) => note.id === incoming.id)) {
              return current.map((note) =>
                note.id === incoming.id ? incoming : note,
              );
            }
            return [incoming, ...current];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const visible = useMemo(() => notes.slice(0, 40), [notes]);

  function roleLabel(role: string | null) {
    if (role === "owner") return t.roleOwner;
    if (role === "manager") return t.roleManager;
    if (role === "waiter") return t.roleWaiter;
    return null;
  }

  async function saveNote() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shift-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const json = (await res.json()) as { note?: ShiftNote; error?: string };
      const saved = json.note;
      if (!res.ok || !saved) {
        setError(json.error ?? t.saveShiftNote);
        return;
      }
      setNotes((current) => {
        if (current.some((note) => note.id === saved.id)) return current;
        return [saved, ...current];
      });
      setTitle("");
      setBody("");
      setOpen(false);
    } catch {
      setError(t.saveShiftNote);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
            <ClipboardListIcon className="size-4" />
          </span>
          {t.shiftBoard}
        </h3>
        {canCompose ? (
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
          >
            <PlusIcon className="size-3.5" />
            {t.addShiftNote}
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.noShiftNotes}</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((note) => {
            const role = roleLabel(note.author_role);
            return (
              <li
                key={note.id}
                className="rounded-lg border border-secondary/30 bg-card p-3"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug">
                    {note.title || note.body.slice(0, 80)}
                  </p>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {relativeTime(note.created_at, t)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {note.body}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {role ? <Badge variant="outline">{role}</Badge> : null}
                  {note.author_email ? (
                    <span className="text-muted-foreground text-xs">
                      {note.author_email}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.addShiftNote}</DialogTitle>
            <DialogDescription>{t.shiftNoteBodyPlaceholder}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="shift-note-title">{t.shiftNoteTitle}</Label>
              <Input
                id="shift-note-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t.shiftNoteTitlePlaceholder}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="shift-note-body">{t.shiftNoteBody}</Label>
              <Textarea
                id="shift-note-body"
                required
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={t.shiftNoteBodyPlaceholder}
                className="min-h-28"
              />
            </div>
            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={busy || !body.trim()}
              onClick={() => void saveNote()}
            >
              {t.saveShiftNote}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
