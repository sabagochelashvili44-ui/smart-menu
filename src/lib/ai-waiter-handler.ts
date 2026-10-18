import {
  buildGuestAssistantSystemPrompt,
  type AssistantDish,
} from "@/lib/ai-assistant";
import { NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type MenuContext = {
  restaurantName?: string;
  locale?: "ka" | "en" | "ru";
  dishes?: AssistantDish[];
};

function lastUserMessage(messages: ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user" && messages[i].content.trim()) {
      return { index: i, content: messages[i].content.trim() };
    }
  }
  return null;
}

function enqueueSseToken(
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController<Uint8Array>,
  line: string,
) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return;
  const data = trimmed.slice(5).trim();
  if (!data || data === "[DONE]") return;
  try {
    const json = JSON.parse(data) as {
      choices?: { delta?: { content?: string } }[];
    };
    const token = json.choices?.[0]?.delta?.content;
    if (token) controller.enqueue(encoder.encode(token));
  } catch {
    /* ignore incomplete JSON lines */
  }
}

function openAiStreamToText(openaiResponse: Response) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = openaiResponse.body?.getReader();
      if (!reader) {
        controller.error(new Error("OpenAI stream missing body"));
        return;
      }

      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            enqueueSseToken(encoder, controller, line);
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function waiterPromptContext(body: {
  messages?: ChatMessage[];
  menuContext?: MenuContext;
  message?: string;
  history?: ChatMessage[];
  dishes?: AssistantDish[];
  restaurantName?: string;
  locale?: "ka" | "en" | "ru";
}) {
  const packedMessages = Array.isArray(body.messages) ? body.messages : [];
  const fromMessages = lastUserMessage(packedMessages);
  const localeRaw = body.menuContext?.locale ?? body.locale;
  const history = (
    fromMessages
      ? packedMessages.slice(0, fromMessages.index)
      : (body.history ?? [])
  )
    .filter((item) => item.role === "user" || item.role === "assistant")
    .slice(-12);
  return {
    message: fromMessages?.content || body.message?.trim() || "",
    restaurantName:
      body.menuContext?.restaurantName?.trim() ||
      body.restaurantName?.trim() ||
      "Georgian House",
    dishes: body.menuContext?.dishes ?? body.dishes ?? [],
    locale: localeRaw === "en" || localeRaw === "ru" ? localeRaw : "ka" as const,
    history,
  };
}

export async function handleAiWaiterPost(request: Request) {
  const ctx = waiterPromptContext(
    (await request.json()) as {
      messages?: ChatMessage[];
      menuContext?: MenuContext;
      message?: string;
      history?: ChatMessage[];
      dishes?: AssistantDish[];
      restaurantName?: string;
      locale?: "ka" | "en" | "ru";
    },
  );
  if (!ctx.message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("[ai-waiter] OPENAI_API_KEY is missing");
    return NextResponse.json(
      { error: "API Error: OpenAI Key missing or stream failed" },
      { status: 503 },
    );
  }

  const system = buildGuestAssistantSystemPrompt(
    ctx.restaurantName,
    ctx.dishes,
    ctx.locale,
  );

  const openaiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.25,
        stream: true,
        messages: [
          { role: "system", content: system },
          ...ctx.history.map((item) => ({
            role: item.role,
            content: item.content,
          })),
          { role: "user", content: ctx.message },
        ],
      }),
    },
  );

  if (!openaiResponse.ok || !openaiResponse.body) {
    const detail = await openaiResponse.text();
    console.error("[ai-waiter] OpenAI request failed", openaiResponse.status, detail);
    return NextResponse.json(
      {
        error: "API Error: OpenAI Key missing or stream failed",
        detail,
      },
      { status: 502 },
    );
  }

  return new Response(openAiStreamToText(openaiResponse), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
