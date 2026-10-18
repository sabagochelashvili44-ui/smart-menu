import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Target = "en" | "ru";

function parseTarget(value: unknown): Target | null {
  return value === "en" || value === "ru" ? value : null;
}

function translationBag(parsed: unknown) {
  if (!parsed || typeof parsed !== "object") return null;
  const root = parsed as Record<string, unknown>;
  if (root.translations && typeof root.translations === "object") {
    return root.translations;
  }
  return parsed;
}

function translationsFromRows(bag: unknown) {
  const translations: Record<string, string> = {};
  if (!Array.isArray(bag)) return translations;
  for (const row of bag) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const source = String(
      item.original ?? item.source ?? item.from ?? item.key ?? "",
    ).trim();
    const target = String(
      item.translation ?? item.translated ?? item.target ?? item.to ?? item.value ?? "",
    ).trim();
    if (source && target) translations[source] = target;
  }
  return translations;
}

function translationsFromMap(bag: unknown, texts: string[]) {
  const translations: Record<string, string> = {};
  if (!bag || typeof bag !== "object") return translations;
  const record = bag as Record<string, unknown>;
  for (const text of texts) {
    const value = record[text];
    if (typeof value === "string" && value.trim()) {
      translations[text] = value.trim();
    }
  }
  return translations;
}

function extractTranslations(
  parsed: unknown,
  texts: string[],
): Record<string, string> {
  const bag = translationBag(parsed);
  if (!bag) return {};
  if (Array.isArray(bag)) return translationsFromRows(bag);
  return translationsFromMap(bag, texts);
}

async function translateChunk(
  apiKey: string,
  target: Target,
  texts: string[],
) {
  const language = target === "ru" ? "Russian" : "English";
  const openaiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a restaurant menu translator. Translate each string into ${language}. Keep Georgian dish identity recognizable (khachapuri, khinkali, sulguni). Return JSON: {"translations":{"<exact original>":"<${language} text>"}}. Translate every input. Never leave Georgian letters in the output.`,
          },
          {
            role: "user",
            content: JSON.stringify({ texts }),
          },
        ],
      }),
    },
  );

  if (!openaiResponse.ok) {
    const detail = await openaiResponse.text();
    console.error(
      "[menu-translate] OpenAI request failed",
      openaiResponse.status,
      detail,
    );
    return { translations: {} as Record<string, string>, error: detail };
  }

  const json = (await openaiResponse.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return {
      translations: extractTranslations(JSON.parse(raw), texts),
      error: null as string | null,
    };
  } catch (error) {
    console.error("[menu-translate] invalid JSON from OpenAI", error, raw);
    return { translations: {} as Record<string, string>, error: "Invalid JSON" };
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    target?: unknown;
    texts?: unknown;
  } | null;

  const target = parseTarget(body?.target);
  const texts = Array.isArray(body?.texts)
    ? [
        ...new Set(
          body.texts
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean),
        ),
      ].slice(0, 300)
    : [];

  if (!target || texts.length === 0) {
    return NextResponse.json({
      translations: {},
      error: "target (en|ru) and texts[] are required",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("[menu-translate] OPENAI_API_KEY is missing");
    return NextResponse.json({
      translations: {},
      error: "OPENAI_API_KEY is missing",
    });
  }

  const translations: Record<string, string> = {};
  const chunkSize = 40;
  let lastError: string | null = null;

  for (let i = 0; i < texts.length; i += chunkSize) {
    const chunk = texts.slice(i, i + chunkSize);
    const result = await translateChunk(apiKey, target, chunk);
    Object.assign(translations, result.translations);
    if (result.error) lastError = result.error;
  }

  return NextResponse.json({
    translations,
    error: Object.keys(translations).length === 0 ? lastError : null,
  });
}
