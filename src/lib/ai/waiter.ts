import type { Dish, Mood, Review } from "@/types/database";

/** Shared GPT-4o instruction: mirror the guest's language exactly. */
export const WAITER_LANGUAGE_RULES = `LANGUAGE (CRITICAL):
- AUTOMATICALLY DETECT the language of the user's message (Georgian, English, Russian, etc.) and reply in THAT EXACT SAME LANGUAGE.
- Never switch to the menu UI language if the guest wrote in another language.
- Do not mix languages in one reply unless the guest mixed them first.
- Keep dish names in their menu form, then add a short gloss in the guest's language (e.g. ხაჭაპური / khachapuri).
- Never repeat generic template greetings. Always answer the specific question asked, using the LIVE MENU.
- If the latest message has no clear language, then use the menu UI language.

GEORGIAN GRAMMAR (when the reply is in Georgian):
- For Georgian replies, strictly use flawless literary grammar, correct syntax, and polite verb forms ('გთხოვთ', 'გირჩევთ').
- Flawless სალიტერატურო ქართული: correct cases, postpositions, person/number of verbs, and punctuation.
- Do not insert Latin letters inside a Georgian sentence except a short transliteration in parentheses after the dish name.
- Use „ქართული ბრჭყალები“ where quotes are needed.`;

export function localWaiterReply(input: {
  message: string;
  dishes: Dish[];
  mood: Mood | null;
  reviews: Review[];
  language: string;
}) {
  const available = input.dishes.filter((d) => d.is_available);
  const highMargin = [...available].sort(
    (a, b) => b.margin_score - a.margin_score,
  );
  const q = input.message.toLowerCase();
  const negative = input.reviews.filter((r) => r.rating <= 2);

  if (negative.length && /slow|wait|bad|cold|awful|terrible|disaster/.test(q)) {
    return `I'm sorry that wasn't right. Kitchen has already been flagged. Tonight I can send Honey Panna Cotta on the house with your next round, and I'll keep the ticket moving. If you want something faster, Garden Crunch Salad and Citrus Spritz usually leave the pass in under 8 minutes.`;
  }

  if (/wine|pair|pairing|malbec|white/.test(q)) {
    const match =
      available.find((d) => q.includes(d.name.toLowerCase().split(" ")[0]!)) ??
      available.find((d) => d.id === "steak") ??
      available[0];
    return match
      ? `${match.name} loves ${match.wine_pairing}. If you want a higher-margin sip the floor team likes, House Malbec or Citrus Spritz both lift the check without feeling pushy.`
      : "Ask me about a dish and I'll pair it.";
  }

  if (input.mood === "healthy" || /healthy|light|salad|fit/.test(q)) {
    return `For a lighter table: Garden Crunch Salad, Herb Sea Bass, and Garden Cooler. Skip the lava cake unless you want a small shared Honey Panna Cotta — still high margin, less heavy.`;
  }

  if (input.mood === "romantic" || /date|romantic|anniversary/.test(q)) {
    return `Go Burrata to share, Herb Sea Bass, and split Dark Chocolate Lava. Wine: Chablis then a glass of House Malbec. Spritz first if you want a slower start.`;
  }

  if (input.mood === "hungry" || /hungry|starving|steak/.test(q)) {
    return `Charred Ribeye with rosemary potatoes, add Truffle Mushroom Risotto if you're sharing, and Malbec. That's the hungry-table build.`;
  }

  if (input.mood === "celebrating" || /birthday|celebrate|party/.test(q)) {
    return `Start with Citrus Spritz, then Ribeye or Risotto, finish with Lava cake and extra gelato. I can also 86 nothing tonight except Lemon Thyme Chicken — it's out of stock.`;
  }

  const pick = highMargin[0];
  return `Popular and kind to the pass: ${available
    .slice(0, 3)
    .map((d) => d.name)
    .join(", ")}. Chef wants ${pick?.name ?? "the risotto"} on more tables — ${pick?.wine_pairing ?? "ask for a pairing"}. You said: "${input.message}". Want me to build a ${input.mood ?? "classic"} three-course? Language: ${input.language}.`;
}

export async function openaiWaiterReply(system: string, messages: { role: "user" | "assistant"; content: string }[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? null;
}
