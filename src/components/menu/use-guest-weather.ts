"use client";

import {
  localExternalContext,
  type ExternalContext,
} from "@/lib/recommendations";
import { useEffect, useState } from "react";

export function useGuestWeather() {
  const [context, setContext] = useState<ExternalContext>(localExternalContext);

  useEffect(() => {
    const fallback = localExternalContext();
    setContext(fallback);
    const controller = new AbortController();
    void fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=41.7151&longitude=44.8271&current=temperature_2m,precipitation",
      { signal: controller.signal },
    )
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as {
          current?: { temperature_2m?: number; precipitation?: number };
        };
        const temperatureC = json.current?.temperature_2m;
        if (typeof temperatureC !== "number") return;
        setContext({
          hour: new Date().getHours(),
          temperatureC,
          rainy: (json.current?.precipitation ?? 0) > 0,
        });
      })
      .catch(() => {
        setContext(localExternalContext());
      });
    return () => controller.abort();
  }, []);

  return context;
}
