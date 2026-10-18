"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyDietFilter,
  inferDietFromText,
  type DietFilter,
} from "@/lib/guest-diet";
import { type MenuLocale, ui } from "@/lib/menu-copy";
import { SendIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ChatDish = {
  name: string;
  description: string;
  price: number;
  allergens: string[] | null;
  is_available: boolean;
  category?: string;
  ingredients?: string[] | null;
  wine_pairing?: string | null;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

export function AiChatbot({
  open,
  onOpenChange,
  restaurantName,
  dishes,
  locale,
  onDietChange,
  pendingPrompt,
  onPendingPromptConsumed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantName: string;
  dishes: ChatDish[];
  locale: MenuLocale;
  onDietChange?: (diet: DietFilter) => void;
  pendingPrompt?: string | null;
  onPendingPromptConsumed?: () => void;
}) {
  const copy = ui[locale];
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: copy.waiterIntro(restaurantName),
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const pendingRef = useRef(false);
  const inputRef = useRef(input);
  const dietRef = useRef(emptyDietFilter());

  messagesRef.current = messages;
  pendingRef.current = pending;
  inputRef.current = input;

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: copy.waiterIntro(restaurantName),
      },
    ]);
  }, [copy, restaurantName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  const sendMessageRef = useRef<(raw?: string) => Promise<void>>(async () => {});

  async function sendMessage(raw?: string) {
    const content = (raw ?? inputRef.current).trim();
    if (!content || pendingRef.current) return;

    pendingRef.current = true;
    setPending(true);
    setNotice(null);

    const next: ChatMessage[] = [
      ...messagesRef.current,
      { role: "user", content },
    ];
    messagesRef.current = next;
    setMessages(next);
    dietRef.current = inferDietFromText(content, dietRef.current);
    onDietChange?.(dietRef.current);
    setInput("");
    inputRef.current = "";

    const menuContext = {
      restaurantName,
      locale,
      dishes: dishes.map((dish) => ({
        name: dish.name,
        description: dish.description,
        price: dish.price,
        allergens: dish.allergens,
        ingredients: dish.ingredients ?? [],
        wine_pairing: dish.wine_pairing ?? "",
        is_available: dish.is_available,
        category: dish.category,
      })),
    };

    try {
      const res = await fetch("/api/ai-waiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-12),
          menuContext,
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !res.body || contentType.includes("application/json")) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const message = json?.error || copy.apiError;
        console.error("[ai-waiter] fetch failed", res.status, json);
        setNotice(message);
        setMessages([...next, { role: "assistant", content: message }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      setMessages([...next, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        const visible = reply;
        setMessages([...next, { role: "assistant", content: visible }]);
      }

      const finalReply = reply.trim();
      if (!finalReply) {
        setNotice(copy.apiError);
        setMessages([...next, { role: "assistant", content: copy.apiError }]);
        return;
      }
      setMessages([...next, { role: "assistant", content: finalReply }]);
    } catch (error) {
      console.error("[ai-waiter] fetch error", error);
      setNotice(copy.apiError);
      setMessages([...next, { role: "assistant", content: copy.apiError }]);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  sendMessageRef.current = sendMessage;

  const consumedPromptRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      consumedPromptRef.current = null;
      return;
    }
    const prompt = pendingPrompt?.trim();
    if (!prompt || consumedPromptRef.current === prompt) return;
    consumedPromptRef.current = prompt;
    onPendingPromptConsumed?.();
    void sendMessageRef.current(prompt);
  }, [open, pendingPrompt, onPendingPromptConsumed]);

  const quickActions = [
    { label: copy.vegetarian, prompt: copy.vegetarianPrompt },
    { label: copy.wine, prompt: copy.winePrompt },
    { label: copy.spicy, prompt: copy.spicyPrompt },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[88dvh] max-h-[88dvh] gap-0 rounded-t-2xl p-0 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[min(40rem,88dvh)] sm:max-w-md sm:rounded-2xl sm:border"
      >
        <SheetHeader className="border-b">
          <SheetTitle className="font-medium tracking-wide">
            {copy.waiterTitle}
          </SheetTitle>
          <SheetDescription>{restaurantName}</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={pending}
                onClick={() => void sendMessage(action.prompt)}
              >
                {action.label}
              </Button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={
                  message.role === "assistant"
                    ? "bg-muted mr-6 rounded-2xl rounded-bl-md px-3 py-2 leading-relaxed"
                    : "bg-primary text-primary-foreground ml-6 rounded-2xl rounded-br-md px-3 py-2 leading-relaxed"
                }
              >
                {message.content}
              </p>
            ))}
            {pending && messages[messages.length - 1]?.role !== "assistant" ? (
              <p className="text-muted-foreground text-xs">{copy.thinking}</p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {notice ? (
            <p role="alert" className="text-destructive px-4 pb-1 text-xs">
              {notice}
            </p>
          ) : null}

          <form
            className="flex gap-2 border-t p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(inputRef.current);
            }}
          >
            <Textarea
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                inputRef.current = event.target.value;
              }}
              placeholder={copy.waiterPlaceholder}
              className="min-h-11 max-h-28"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(inputRef.current);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={pending || !input.trim()}
              aria-label={copy.sendChat}
            >
              <SendIcon className="size-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
