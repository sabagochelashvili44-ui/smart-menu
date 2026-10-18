"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/i18n";
import type { Lang, Mood } from "@/types/database";
import { useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function AiWaiterChat({
  restaurantId,
  lang,
  mood,
}: {
  restaurantId: string;
  lang: Lang;
  mood: Mood;
}) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I can pair wine, build a mood-based order, or recover a bad experience. What are we eating?",
    },
  ]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          message: text,
          mood,
          language: lang,
          history: next.slice(-8),
        }),
      });
      const json = (await res.json()) as { reply?: string };
      setMessages([
        ...next,
        { role: "assistant", content: json.reply ?? "Let me check with the pass." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(lang, "waiter")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-56 space-y-2 overflow-y-auto text-sm">
          {messages.map((message, i) => (
            <p
              key={`${message.role}-${i}`}
              className={
                message.role === "assistant"
                  ? "bg-muted rounded-lg p-2"
                  : "text-right"
              }
            >
              {message.content}
            </p>
          ))}
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t(lang, "ask")}
        />
        <Button type="button" disabled={pending} onClick={() => void send()}>
          {t(lang, "send")}
        </Button>
      </CardContent>
    </Card>
  );
}
