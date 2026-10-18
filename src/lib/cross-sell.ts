export type CrossSellKind = "drink" | "side" | "dessert";

export type CrossSellDish = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
};

type CategoryRef = { id: string; name: string };

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

export function companionKind(categoryName: string): CrossSellKind | null {
  const name = normalize(categoryName);
  if (
    includesAny(name, [
      "drink",
      "wine",
      "beer",
      "spirit",
      "სასმელ",
      "ღვინო",
      "ლუდი",
      "напит",
      "вино",
      "пиво",
    ])
  ) {
    return "drink";
  }
  if (
    includesAny(name, [
      "dessert",
      "sweet",
      "დესერტ",
      "ტკბილ",
      "десерт",
    ])
  ) {
    return "dessert";
  }
  if (
    includesAny(name, [
      "side",
      "bread",
      "garnish",
      "გარნირ",
      "პური",
      "гарнир",
      "хлеб",
    ])
  ) {
    return "side";
  }
  return null;
}

export function isAnchorCategory(categoryName: string) {
  if (companionKind(categoryName)) return false;
  const name = normalize(categoryName);
  return includesAny(name, [
    "khachapuri",
    "ხაჭაპურ",
    "хачапур",
    "khinkali",
    "ხინკალ",
    "хинкал",
    "main",
    "grill",
    "fish",
    "თევზ",
    "მწვად",
    "ძირითად",
    "starter",
    "salad",
    "soup",
    "სალათ",
    "სუპ",
    "vegetarian",
    "ვეგეტარ",
  ]);
}

function kindOfDish(
  dish: CrossSellDish,
  categories: CategoryRef[],
): CrossSellKind | null {
  const category =
    categories.find((row) => row.id === dish.category_id)?.name ?? "";
  return companionKind(category);
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function rotate<T>(items: T[], seed: number) {
  if (items.length < 2) return items;
  const offset = seed % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function drinkBoost(dishName: string, hints: string[]) {
  if (!hints.length) return 0;
  const name = normalize(dishName);
  return hints.some((hint) => name.includes(hint)) ? 1 : 0;
}

function drinkHintsForAnchor(anchorName: string, categoryName: string) {
  const blob = normalize(`${anchorName} ${categoryName}`);
  if (includesAny(blob, ["khinkali", "ხინკალ", "хинкал"])) {
    return ["beer", "ლუდი", "пиво", "lemonade", "limon"];
  }
  if (includesAny(blob, ["khachapuri", "ხაჭაპურ", "хачапур"])) {
    return ["wine", "ღვინო", "вино", "tarragon", "ტარხუნ"];
  }
  if (includesAny(blob, ["grill", "მწვად", "fish", "თევზ"])) {
    return ["wine", "ღვინო", "beer", "ლუდი"];
  }
  return [];
}

const KIND_ORDER: CrossSellKind[] = ["drink", "side", "dessert"];

export function pickCrossSells({
  dishes,
  categories,
  cartIds,
  seed = "",
  limit = 3,
}: {
  dishes: CrossSellDish[];
  categories: CategoryRef[];
  cartIds: Iterable<string>;
  seed?: string;
  limit?: number;
}): CrossSellDish[] {
  const inCart = new Set(cartIds);
  const categoryById = new Map(categories.map((row) => [row.id, row.name]));
  const cartKinds = new Set<CrossSellKind>();
  let hasAnchor = false;
  let hints: string[] = [];

  for (const dish of dishes) {
    if (!inCart.has(dish.id)) continue;
    const category = categoryById.get(dish.category_id) ?? "";
    const kind = companionKind(category);
    if (kind) cartKinds.add(kind);
    if (isAnchorCategory(category)) {
      hasAnchor = true;
      if (!hints.length) hints = drinkHintsForAnchor(dish.name, category);
    }
  }

  if (!hasAnchor) return [];

  const candidates = dishes.filter((dish) => {
    if (!dish.is_available || inCart.has(dish.id)) return false;
    return kindOfDish(dish, categories) !== null;
  });

  const byKind: Record<CrossSellKind, CrossSellDish[]> = {
    drink: [],
    side: [],
    dessert: [],
  };

  for (const dish of candidates) {
    const kind = kindOfDish(dish, categories);
    if (!kind) continue;
    byKind[kind].push(dish);
  }

  const seedValue = hashSeed(seed);
  for (const kind of KIND_ORDER) {
    byKind[kind].sort((left, right) => {
      const imageDelta =
        Number(Boolean(right.image_url?.trim())) -
        Number(Boolean(left.image_url?.trim()));
      if (imageDelta) return imageDelta;
      if (kind === "drink") {
        const boost =
          drinkBoost(right.name, hints) - drinkBoost(left.name, hints);
        if (boost) return boost;
      }
      return left.price - right.price || left.name.localeCompare(right.name);
    });
    byKind[kind] = rotate(byKind[kind], seedValue);
  }

  const missing = KIND_ORDER.filter((kind) => !cartKinds.has(kind));
  const fillOrder = [...missing, ...KIND_ORDER.filter((kind) => cartKinds.has(kind))];
  const picked: CrossSellDish[] = [];
  const used = new Set<string>();

  for (const kind of fillOrder) {
    if (picked.length >= limit) break;
    const next = byKind[kind].find((dish) => !used.has(dish.id));
    if (!next) continue;
    used.add(next.id);
    picked.push(next);
  }

  for (const kind of fillOrder) {
    for (const dish of byKind[kind]) {
      if (picked.length >= limit) break;
      if (used.has(dish.id)) continue;
      used.add(dish.id);
      picked.push(dish);
    }
  }

  return picked.slice(0, limit);
}
