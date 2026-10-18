import { WAITER_LANGUAGE_RULES } from "@/lib/ai/waiter";
import { DISH_I18N } from "@/lib/georgian-house-i18n";

export type AssistantDish = {
  name: string;
  description?: string | null;
  price?: number | null;
  allergens?: string[] | null;
  ingredients?: string[] | null;
  wine_pairing?: string | null;
  category?: string | null;
  is_available?: boolean;
};

/** Georgian House dishes that contain walnuts or walnut sauce/oil. */
const NUT_DISH_KEYS = new Set([
  "ფხალი ასორტი",
  "ბადრიჯანი ნიგვზით",
  "ქართული სალათი",
  "ჭარხლის სალათი ნიგვზით",
  "საცივი",
  "შქმერული",
  "ბაჟე",
  "კალმახი ნიგვზით",
  "შქმერული სოკოთი",
  "ფხალი თეფში",
  "ეკალა ნიგვზით",
  "თაფლის ნამცხვარი კაკლით",
  "გოზინაყი",
  "ჩურჩხელა",
  "ბაქლავა",
]);

const NUT_FREE_ALTERNATIVES = [
  "აჯაფსანდალი",
  "ბადრიჯანი გრილზე",
  "თბილისური სალათი",
  "ავოკადოს სალათი",
  "ქაბაბი ბოსტნეულით",
  "კალმახი გრილზე",
  "ფელამუში",
  "ხილის ასორტი",
];

function catalogEntry(name: string) {
  if (DISH_I18N[name]) {
    return { ka: name, ...DISH_I18N[name] };
  }
  const match = Object.entries(DISH_I18N).find(
    ([ka, translated]) =>
      ka === name ||
      translated.en.name.toLowerCase() === name.toLowerCase() ||
      translated.ru.name.toLowerCase() === name.toLowerCase(),
  );
  if (!match) return null;
  return { ka: match[0], ...match[1] };
}

function uniqueTags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const key = tag.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(tag.trim());
  }
  return out;
}

function inferAllergens(
  kaName: string,
  text: string,
  listed: string[],
): string[] {
  const blob = `${kaName} ${text}`.toLowerCase();
  const tags = [...listed];

  const hasNuts =
    NUT_DISH_KEYS.has(kaName) ||
    kaName.includes("ნიგვზ") ||
    /\bwalnuts?\b/.test(blob) ||
    /\bhazelnut|\balmond|\bpistachio|\bpeanut/.test(blob);
  if (hasNuts) tags.push("nuts");

  if (
    /sulguni|cheese|yogurt|matsoni|nadughi|elarji|dairy|butter|cream|ice cream|panna cotta|cappuccino|khachapuri|gebzhalia/.test(
      blob,
    ) ||
    /სულგუნი|ყველ|მატსონი|ნადუღი|ელარჯი|ხაჭაპური|გებჟალია/.test(kaName)
  ) {
    tags.push("dairy");
  }

  if (
    /khachapuri|shoti|bread|pastry|baklava|khinkali|gluten|wheat|flour|dough|nazuki/.test(
      blob,
    ) ||
    /ხაჭაპური|შოთი|პური|ხინკალი|ბაქლავა|ნაზუქი/.test(kaName)
  ) {
    tags.push("gluten");
  }

  if (
    /\beggs?\b|chikhirtma|adjarian/.test(blob) ||
    /კვერცხ|ჩიხირთმა|აჭარული/.test(kaName)
  ) {
    tags.push("eggs");
  }

  if (
    /trout|salmon|fish|catfish|dorado|shrimp|mussel|calamari|shellfish/.test(
      blob,
    ) ||
    /კალმახი|ორაგული|თევზ|სომი|დორადო|კრევეტ|მიდი|კალმარ/.test(kaName)
  ) {
    if (/shrimp|mussel|calamari|კრევეტ|მიდი|კალმარ/.test(blob + kaName)) {
      tags.push("shellfish");
    }
    if (/trout|salmon|fish|catfish|dorado|კალმახი|ორაგული|თევზ|სომი|დორადო/.test(blob + kaName)) {
      tags.push("fish");
    }
  }

  if (/wine|საფერავი|რქაწითელი|ღვინ/.test(blob + kaName)) {
    tags.push("sulfites");
  }

  return uniqueTags(tags);
}

function formatGel(price: number | null | undefined) {
  if (typeof price !== "number" || Number.isNaN(price)) {
    return "price on request";
  }
  return `₾${price.toFixed(2)} GEL`;
}

function ingredientLine(
  dish: AssistantDish,
  catalog: ReturnType<typeof catalogEntry>,
) {
  if (dish.ingredients?.length) {
    return dish.ingredients.join(", ");
  }
  const parts = [dish.description, catalog?.en.description].filter(Boolean);
  return parts.join(" ").trim() || "not listed — confirm with the kitchen";
}

export function buildMenuContext(dishes: AssistantDish[]) {
  if (!dishes.length) {
    return "The live menu was not provided. Politely say you will confirm with the floor team.";
  }

  const grouped = new Map<string, AssistantDish[]>();
  for (const dish of dishes) {
    const key = (dish.category ?? "Menu").trim() || "Menu";
    const list = grouped.get(key) ?? [];
    list.push(dish);
    grouped.set(key, list);
  }

  const blocks: string[] = [];
  for (const [category, rows] of grouped) {
    const lines = rows.map((dish) => {
      const catalog = catalogEntry(dish.name);
      const kaName = catalog?.ka ?? dish.name;
      const enName = catalog?.en.name ?? "";
      const ruName = catalog?.ru.name ?? "";
      const breakdown = ingredientLine(dish, catalog);
      const description =
        dish.description?.trim() ||
        catalog?.en.description ||
        catalog?.ka ||
        "";
      const allergens = inferAllergens(
        kaName,
        `${dish.description ?? ""} ${breakdown} ${enName}`,
        dish.allergens ?? [],
      );
      const available =
        dish.is_available === false ? "unavailable" : "available";
      const names = [kaName, enName, ruName].filter(Boolean).join(" / ");
      const nutFlag = NUT_DISH_KEYS.has(kaName)
        ? "\n    SAFETY: CONTAINS NUTS (walnut). Do not recommend for nut allergy."
        : "";
      const pairing = dish.wine_pairing?.trim()
        ? `\n    Wine pairing: ${dish.wine_pairing.trim()}`
        : "";

      return `  - ${names} — ${formatGel(dish.price)} — ${available}
    Description: ${description || "see ingredients"}
    Ingredients: ${breakdown}
    Allergens: ${allergens.length ? allergens.join(", ") : "none listed"}${pairing}${nutFlag}`;
    });
    blocks.push(`### ${category}\n${lines.join("\n")}`);
  }

  return blocks.join("\n\n");
}

export function buildGuestAssistantSystemPrompt(
  restaurantName: string,
  dishes: AssistantDish[],
  locale: "ka" | "en" | "ru" = "ka",
) {
  const nutList = [...NUT_DISH_KEYS].join(", ");
  const nutFree = NUT_FREE_ALTERNATIVES.join(", ");
  const uiLanguage =
    locale === "en" ? "English" : locale === "ru" ? "Russian" : "Georgian";

  return `You are a polite, expert digital waiter for ${restaurantName}.

ROLE
- Answer questions about ingredients, allergens, wine pairings, and dietary recommendations based on the LIVE MENU.
- Also cover flavor profiles, spicy levels, and typical prep time when asked. If calories, spice, or prep time are not printed, give a cautious estimate labeled as approximate — or say you will confirm with the kitchen. Never invent a dish, price, or allergen.
- Tone: warm, polite, and helpful. Professional, never robotic, never pushy.
- One gracious greeting at most. Do not reopen with the same welcome every turn.

SCOPE
- If a request is unrelated to food, dining, wine, allergens, or this restaurant, politely decline and redirect the guest back to the menu.

${WAITER_LANGUAGE_RULES}
- Menu UI language (fallback only): ${uiLanguage}.
- You are fluent in Georgian, English, Russian, German, Turkish, and other common guest languages. Mirror the guest.

MENU TRUTH
- LIVE MENU below (categories, dishes, prices, descriptions, ingredients, allergens, pairings) is the only source of truth.
- Quote prices as ₾X.XX GEL. Recommend only available dishes unless the guest asks about an unavailable item — then apologise once and offer a close alternative.
- Prefer short sections or a few bullets so the reply is easy to read on a phone. Keep answers concise (about 80–130 words) unless the guest asks for more detail.

ALLERGENS — ZERO TOLERANCE
- Treat allergies as safety, not preference. If unsure, say you will confirm with the kitchen and do not guess "probably fine".
- Nut allergy: NEVER recommend walnut dishes. Strictly warn against Satsivi (საცივი), Bazhe/Baje (ბაჟე), Badrijani nigvzit (ბადრიჯანი ნიგვზით), Churchkhela (ჩურჩხელა), and also pkhali, shkmeruli with walnuts, trout in walnut sauce, gozinaki, baklava, honey-walnut cake, Georgian salad with walnut oil, and beet salad with walnuts.
- House nut dishes include: ${nutList}.
- Nut-free directions when those items are on the menu: ${nutFree} (only if listed as available). Mention gluten/dairy/eggs/fish/shellfish when relevant.
- Jonjoli is pickled bladdernut blossom — not a tree-nut garnish; do not treat it as walnut unless the kitchen confirms otherwise.

QVEVRI WINE & COMBINATIONS
- Upsell softly: one pairing or one extra (starter, bread, or glass) that belongs with the guest's choice. Never stack multiple pitches.
- Traditional knowledge, mapped to what is actually on the LIVE MENU:
  • Meats, mtsvadi, khinkali, hearty mains → dry red: Mukuzani-style Saperavi (offer საფერავი ჭიქა/ბოთლი if listed).
  • Poultry, satsivi (if no nut allergy), fish, lighter plates → white/amber: Tsinandali or Khikhvi character — offer ქისი, მწვანე, ცოლიკაური, or რქაწითელი qvevri if listed.
  • Semi-sweet with desserts or for guests who ask sweet: ხვანჭკარა, ქინძმარაული, ტვიში if listed.
- If Mukuzani, Tsinandali, or Khikhvi are not on the list, say so briefly and pair the closest listed wine. Do not invent vintages.

LIVE MENU:
${buildMenuContext(dishes)}`;
}
