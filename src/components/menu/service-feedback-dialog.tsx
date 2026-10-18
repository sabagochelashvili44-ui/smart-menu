"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { MenuLocale } from "@/lib/menu-copy";
import { ui } from "@/lib/menu-copy";
import { StarIcon } from "lucide-react";
import { useState } from "react";

type Step = "rate" | "positive" | "negative" | "thanks";

export function ServiceFeedbackDialog({
  open,
  onOpenChange,
  restaurantId,
  tableId,
  tableNumber,
  googleReviewUrl,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  googleReviewUrl: string | null | undefined;
  locale: MenuLocale;
}) {
  const copy = ui[locale];
  const [step, setStep] = useState<Step>("rate");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep("rate");
    setRating(0);
    setHover(0);
    setComment("");
    setSending(false);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function pickRating(stars: number) {
    setRating(stars);
    setError(null);
    if (stars >= 4) {
      setStep("positive");
      const url = googleReviewUrl?.trim();
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return;
    }
    setStep("negative");
  }

  function openGoogle() {
    const url = googleReviewUrl?.trim();
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function submitNegative() {
    if (sending) return;
    setSending(true);
    setError(null);
    const note = comment.trim();
    const alert = `⚠️ ყურადღება! მაგიდა ${tableNumber}-ზე დაბალი შეფასებაა (${rating}/5): ${note || "—"}`;
    try {
      const res = await fetch("/api/waiter-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          table_id: tableId,
          table_number: tableNumber,
          call_type: "low_rating",
          items: [
            {
              dish_id: "low_rating",
              name: alert,
              quantity: 1,
              unit_price: 0,
            },
          ],
        }),
      });
      const json = (await res.json()) as { call?: { id: string }; error?: string };
      if (!res.ok || !json.call) {
        setError(json.error ?? copy.callFail);
        return;
      }
      setStep("thanks");
    } catch {
      setError(copy.callFail);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "rate" ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.feedbackTitle}</DialogTitle>
              <DialogDescription className="sr-only">
                {copy.feedbackTitle}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center gap-1 py-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= (hover || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    className="rounded-md p-1 transition hover:scale-110"
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => pickRating(star)}
                    aria-label={`${star}/5`}
                  >
                    <StarIcon
                      className={
                        filled
                          ? "size-8 fill-amber-400 text-amber-400"
                          : "size-8 text-muted-foreground"
                      }
                    />
                  </button>
                );
              })}
            </div>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              {copy.feedbackSkip}
            </Button>
          </>
        ) : null}

        {step === "positive" ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.feedbackPositive}</DialogTitle>
            </DialogHeader>
            {googleReviewUrl?.trim() ? (
              <Button type="button" onClick={openGoogle}>
                {copy.feedbackGoogle}
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              {copy.feedbackSkip}
            </Button>
          </>
        ) : null}

        {step === "negative" ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.feedbackNegativePrompt}</DialogTitle>
            </DialogHeader>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              autoFocus
            />
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <Button type="button" onClick={() => void submitNegative()} disabled={sending}>
              {sending ? "…" : copy.feedbackSubmit}
            </Button>
          </>
        ) : null}

        {step === "thanks" ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.feedbackThanks}</DialogTitle>
            </DialogHeader>
            <Button type="button" onClick={() => handleOpenChange(false)}>
              {copy.feedbackSkip}
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
