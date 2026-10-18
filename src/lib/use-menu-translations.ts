"use client";

import {
  applyMenuTranslations,
  loadStoredMenuTranslations,
  needsLiveTranslation,
  staticMenuTranslation,
  type MenuLocale,
} from "@/lib/menu-copy";
import { useEffect, useMemo, useState } from "react";

export function useMenuTranslations(locale: MenuLocale, phrases: string[]) {
  loadStoredMenuTranslations();
  const [liveMap, setLiveMap] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState(false);
  const signature = useMemo(
    () => phrases.map((item) => item.trim()).filter(Boolean).join("\n"),
    [phrases],
  );

  useEffect(() => {
    setLiveMap({});
    if (locale === "ka") {
      setTranslating(false);
      return;
    }

    const unique = [...new Set(signature.split("\n").filter(Boolean))];
    const missing = unique.filter((text) => needsLiveTranslation(text, locale));
    if (missing.length === 0) {
      setTranslating(false);
      return;
    }

    const generation = { current: true };
    setTranslating(true);

    void fetch("/api/menu-translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: locale, texts: missing }),
    })
      .then(async (res) => {
        const json = (await res.json()) as {
          translations?: Record<string, string>;
          error?: string | null;
        };
        if (json.error) {
          console.error("[menu-translate]", json.error);
        }
        const map = json.translations ?? {};
        if (!generation.current) return;
        if (Object.keys(map).length > 0) {
          applyMenuTranslations(locale, map);
          setLiveMap((current) => ({ ...current, ...map }));
        }
      })
      .catch((error) => {
        console.error("[menu-translate] fetch failed", error);
      })
      .finally(() => {
        if (generation.current) setTranslating(false);
      });

    return () => {
      generation.current = false;
    };
  }, [locale, signature]);

  const translate = useMemo(() => {
    return (text: string) => {
      if (!text) return text;
      if (locale === "ka") return text;
      const live = liveMap[text] || liveMap[text.trim()];
      if (live) return live;
      return staticMenuTranslation(text, locale) || (translating ? "…" : text);
    };
  }, [liveMap, locale, translating]);

  return { translating, translate };
}
