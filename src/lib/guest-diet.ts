export type DietFilter = {
  blockedAllergens: string[];
  vegan: boolean;
  vegetarian: boolean;
};

const EMPTY: DietFilter = {
  blockedAllergens: [],
  vegan: false,
  vegetarian: false,
};

const ALLERGEN_HINTS: Array<{ tag: string; pattern: RegExp }> = [
  {
    tag: "nuts",
    pattern:
      /nut allerg|walnut|ნიგვზ|თხილ|орех|без орех|nut[- ]free|არ მინდა ნიგოზ/i,
  },
  {
    tag: "gluten",
    pattern: /gluten|გლუტენ|глютен|celiac|ცელიაკ/i,
  },
  {
    tag: "dairy",
    pattern: /dairy|lactose|რძის|რძე|лактоз|молочн|არ მინდა ყველ/i,
  },
  {
    tag: "eggs",
    pattern: /egg allerg|კვერცხის ალერგ|аллерг.*яиц/i,
  },
  {
    tag: "fish",
    pattern: /fish allerg|თევზის ალერგ|аллерг.*рыб/i,
  },
  {
    tag: "shellfish",
    pattern: /shellfish|კრევეტ|моллюск/i,
  },
];

export function emptyDietFilter(): DietFilter {
  return { ...EMPTY, blockedAllergens: [] };
}

export function inferDietFromText(text: string, current = emptyDietFilter()) {
  const next: DietFilter = {
    vegan: current.vegan,
    vegetarian: current.vegetarian,
    blockedAllergens: [...current.blockedAllergens],
  };
  const blob = text.trim();
  if (!blob) return next;

  if (/vegan|ვეგან|веган/i.test(blob)) {
    next.vegan = true;
    next.vegetarian = true;
  }
  if (/vegetarian|ვეგეტარ|вегетариан/i.test(blob)) {
    next.vegetarian = true;
  }

  for (const hint of ALLERGEN_HINTS) {
    if (hint.pattern.test(blob) && !next.blockedAllergens.includes(hint.tag)) {
      next.blockedAllergens.push(hint.tag);
    }
  }
  return next;
}

export function dishMatchesDiet(
  dish: {
    name: string;
    description?: string | null;
    allergens?: string[] | null;
    ingredients?: string[] | null;
    category?: string | null;
  },
  diet: DietFilter,
) {
  const listed = (dish.allergens ?? []).map((item) => item.toLowerCase());
  for (const blocked of diet.blockedAllergens) {
    if (listed.includes(blocked)) return false;
  }

  const blob = `${dish.name} ${dish.description ?? ""} ${(dish.ingredients ?? []).join(" ")} ${dish.category ?? ""}`.toLowerCase();

  if (diet.blockedAllergens.includes("nuts")) {
    if (/ნიგვზ|walnut|орех|ნიგოზ|hazelnut|pistachio/.test(blob)) return false;
  }
  if (diet.blockedAllergens.includes("gluten")) {
    if (/ხაჭაპურ|ხინკალ|პური|შოთი|khachapuri|khinkali|bread|gluten|мук|тесто/.test(blob)) {
      return false;
    }
  }

  if (diet.vegan || diet.vegetarian) {
    if (
      /მწვად|ხინკალ|ქაბაბ|სტეიკ|chashushuli|მწვადი|mtsvadi|pork|beef|lamb|meat|ხორც|говяд|свин|баран/.test(
        blob,
      )
    ) {
      return false;
    }
  }
  if (diet.vegan) {
    if (
      /ყველ|სულგუნ|რძ|კვერცხ|ხაჭაპურ|dairy|cheese|egg|sulguni|matsoni|йогурт|сыр/.test(
        blob,
      )
    ) {
      return false;
    }
  }
  if (diet.vegetarian || diet.vegan) {
    if (/თევზ|კალმახ|fish|trout|shrimp|seafood|рыб/.test(blob)) return false;
  }

  return true;
}
