import { pickCrossSells, type CrossSellDish } from "@/lib/cross-sell";
import { dishMatchesDiet, type DietFilter } from "@/lib/guest-diet";

export type RecommendableDish = CrossSellDish & {
  description?: string | null;
  allergens?: string[] | null;
  ingredients?: string[] | null;
};

export type ExternalContext = {
  hour: number;
  temperatureC: number | null;
  rainy: boolean;
};

export type UpsellHeading = "together" | "chef";

export type UpsellResult = {
  heading: UpsellHeading;
  items: RecommendableDish[];
};

type CategoryRef = { id: string; name: string };

type CartLine = { id: string; quantity: number };

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function blobOf(dish: RecommendableDish, category: string) {
  return normalize(
    `${dish.name} ${dish.description ?? ""} ${(dish.ingredients ?? []).join(" ")} ${category}`,
  );
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

function categoryName(
  dish: RecommendableDish,
  categories: CategoryRef[],
) {
  return categories.find((row) => row.id === dish.category_id)?.name ?? "";
}

function isRedMeat(blob: string) {
  return includesAny(blob, [
    "mtsvadi",
    "მწვად",
    "chashushuli",
    "ჩაშუშულ",
    "pork",
    "ღორ",
    "beef",
    "საქონლ",
    "lamb",
    "ცხვარ",
    "ქაბაბ",
    "steak",
    "grill",
    "мангал",
    "говяд",
    "свин",
  ]);
}

function isFishOrPoultry(blob: string) {
  return includesAny(blob, [
    "fish",
    "თევზ",
    "trout",
    "კალმახ",
    "chicken",
    "ქათამ",
    "poultry",
    "shrimp",
    "seafood",
    "рыб",
    "куриц",
  ]);
}

function isMain(blob: string, category: string) {
  const hay = `${blob} ${normalize(category)}`;
  return includesAny(hay, [
    "main",
    "grill",
    "ძირითად",
    "მწვად",
    "khinkali",
    "ხინკალ",
    "khachapuri",
    "ხაჭაპურ",
    "fish",
    "თევზ",
  ]);
}

function isAppetizer(blob: string, category: string) {
  const hay = `${blob} ${normalize(category)}`;
  return includesAny(hay, [
    "starter",
    "salad",
    "soup",
    "სალათ",
    "სუპ",
    "ცივი",
    "закуск",
    "салат",
    "суп",
    "pkhali",
    "ფხალ",
  ]);
}

function isDessert(blob: string, category: string) {
  const hay = `${blob} ${normalize(category)}`;
  return includesAny(hay, ["dessert", "დესერტ", "десерт", "cake", "ice cream"]);
}

function isRedWine(blob: string) {
  return includesAny(blob, [
    "saperavi",
    "საფერავ",
    "kindzmarauli",
    "ქინძმარაულ",
    "mukuzani",
    "მუკუზან",
    "red wine",
    "წითელი ღვინო",
    "красн",
  ]);
}

function isWhiteWineOrChacha(blob: string) {
  return includesAny(blob, [
    "tsinandali",
    "წინანდალ",
    "rkatsiteli",
    "რქაწითელ",
    "kisi",
    "ქისი",
    "white",
    "თეთრი ღვინო",
    "chacha",
    "ჭაჭა",
    "чача",
    "бел",
  ]);
}

function isPlatter(blob: string) {
  return includesAny(blob, [
    "platter",
    "assort",
    "ასორტ",
    "cheese plate",
    "ყველის თეფშ",
    "ხორცის თეფშ",
    "sharing",
    "ассорти",
  ]);
}

function isKhachapuriOrPizza(blob: string) {
  return includesAny(blob, [
    "khachapuri",
    "ხაჭაპურ",
    "pizza",
    "პიცა",
    "пицц",
    "хачапур",
  ]);
}

function isCoffeeOrJuice(blob: string) {
  return includesAny(blob, [
    "coffee",
    "espresso",
    "ყავა",
    "кофе",
    "juice",
    "წვენ",
    "сок",
    "fresh",
  ]);
}

function isEveningDrink(blob: string) {
  return includesAny(blob, [
    "cocktail",
    "კოქტეილ",
    "wine",
    "ღვინო",
    "вино",
    "chacha",
    "ჭაჭა",
    "cognac",
    "კონიაკ",
    "digestif",
    "vermouth",
    "aperol",
    "mojito",
  ]);
}

function isHotWeather(blob: string) {
  return includesAny(blob, [
    "lemonade",
    "ლიმონათ",
    "aperol",
    "iced",
    "ყინულ",
    "salad",
    "სალათ",
    "tarragon",
    "ტარხუნ",
    "lagidze",
  ]);
}

function isColdWeather(blob: string) {
  return includesAny(blob, [
    "soup",
    "სუპ",
    "kharcho",
    "ხარჩო",
    "chikhirtma",
    "tea",
    "ჩაი",
    "чай",
    "mulled",
    "გლინტვეინ",
    "глинтвейн",
  ]);
}

export function localExternalContext(now = new Date()): ExternalContext {
  const hour = now.getHours();
  const month = now.getMonth() + 1;
  let temperatureC = 16;
  if (month >= 6 && month <= 8) temperatureC = 29;
  else if (month === 5 || month === 9) temperatureC = 22;
  else if (month === 11 || month === 12 || month <= 2) temperatureC = 4;
  return {
    hour,
    temperatureC,
    rainy: month === 11 || month === 3,
  };
}

type CartAnalysis = {
  redMeat: boolean;
  fishPoultry: boolean;
  mains: number;
  hasAppetizer: boolean;
  hasDessert: boolean;
  quantity: number;
  unique: number;
};

function pairingPoints(blob: string, cart: CartAnalysis, context: ExternalContext) {
  let score = 0;
  let pairing = false;
  if (cart.redMeat && isRedWine(blob)) {
    score += 8;
    pairing = true;
  }
  if (cart.fishPoultry && isWhiteWineOrChacha(blob)) {
    score += 8;
    pairing = true;
  }
  if (context.hour >= 19 && isEveningDrink(blob)) {
    score += 4;
    pairing = true;
  }
  return { score, pairing };
}

function chefPoints(
  blob: string,
  category: string,
  cart: CartAnalysis,
  context: ExternalContext,
) {
  let score = 0;
  let chef = false;
  if (cart.mains >= 2 && !cart.hasAppetizer && (isPlatter(blob) || isAppetizer(blob, category))) {
    score += 6;
    chef = true;
  }
  if (cart.mains >= 2 && !cart.hasDessert && isDessert(blob, category)) {
    score += 5;
    chef = true;
  }
  if ((cart.quantity >= 6 || cart.unique >= 4) && (isPlatter(blob) || isKhachapuriOrPizza(blob))) {
    score += 6;
    chef = true;
  }
  if (context.hour < 12 && isCoffeeOrJuice(blob)) {
    score += 4;
    chef = true;
  }
  const temp = context.temperatureC ?? 16;
  if (temp > 25 && isHotWeather(blob)) {
    score += 5;
    chef = true;
  }
  if ((temp <= 12 || context.rainy) && isColdWeather(blob)) {
    score += 5;
    chef = true;
  }
  return { score, chef };
}

function scoreCandidate(
  dish: RecommendableDish,
  category: string,
  cart: CartAnalysis,
  context: ExternalContext,
) {
  const blob = blobOf(dish, category);
  const pairing = pairingPoints(blob, cart, context);
  const chef = chefPoints(blob, category, cart, context);
  return {
    score: pairing.score + chef.score + (dish.image_url?.trim() ? 0.2 : 0),
    pairing: pairing.pairing,
    chef: chef.chef,
  };
}

function analyzeCart(
  dishes: RecommendableDish[],
  categories: CategoryRef[],
  cart: CartLine[],
): CartAnalysis {
  const analysis: CartAnalysis = {
    redMeat: false,
    fishPoultry: false,
    mains: 0,
    hasAppetizer: false,
    hasDessert: false,
    quantity: cart.reduce((sum, line) => sum + line.quantity, 0),
    unique: cart.length,
  };
  for (const line of cart) {
    const dish = dishes.find((item) => item.id === line.id);
    if (!dish) continue;
    const category = categoryName(dish, categories);
    const blob = blobOf(dish, category);
    if (isRedMeat(blob)) analysis.redMeat = true;
    if (isFishOrPoultry(blob)) analysis.fishPoultry = true;
    if (isMain(blob, category)) analysis.mains += line.quantity > 0 ? 1 : 0;
    if (isAppetizer(blob, category)) analysis.hasAppetizer = true;
    if (isDessert(blob, category)) analysis.hasDessert = true;
  }
  return analysis;
}

export function pickContextUpsells({
  dishes,
  categories,
  cart,
  diet,
  context,
  limit = 3,
}: {
  dishes: RecommendableDish[];
  categories: CategoryRef[];
  cart: CartLine[];
  diet: DietFilter;
  context: ExternalContext;
  limit?: number;
}): UpsellResult {
  const inCart = new Set(cart.map((line) => line.id));
  const analysis = analyzeCart(dishes, categories, cart);

  const ranked = dishes
    .filter((dish) => {
      if (!dish.is_available || inCart.has(dish.id)) return false;
      const category = categoryName(dish, categories);
      return dishMatchesDiet({ ...dish, category }, diet);
    })
    .map((dish) => {
      const category = categoryName(dish, categories);
      const scored = scoreCandidate(dish, category, analysis, context);
      return { dish, ...scored };
    })
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score || left.dish.price - right.dish.price);

  const picked = ranked.slice(0, limit).map((row) => row.dish);
  const pairingHeavy =
    ranked.slice(0, limit).filter((row) => row.pairing).length >=
    ranked.slice(0, limit).filter((row) => row.chef).length;

  if (picked.length > 0) {
    return { heading: pairingHeavy ? "together" : "chef", items: picked };
  }

  const fallback = pickCrossSells({
    dishes,
    categories,
    cartIds: inCart,
    seed: cart[cart.length - 1]?.id ?? "",
    limit,
  }).filter((dish) => {
    const category = categoryName(dish, categories);
    const full = dishes.find((item) => item.id === dish.id) ?? dish;
    return dishMatchesDiet({ ...full, category }, diet);
  });

  return { heading: "together", items: fallback };
}
