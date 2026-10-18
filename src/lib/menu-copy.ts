import { DISH_I18N } from "@/lib/georgian-house-i18n";
import { INGREDIENT_I18N } from "@/lib/ingredient-i18n";

export type MenuLocale = "ka" | "en" | "ru";

type LocaleMap = Partial<Record<MenuLocale, string>>;

function aliasLocaleMap(
  maps: Record<string, LocaleMap>,
  entry: LocaleMap,
  ...keys: Array<string | undefined>
) {
  for (const key of keys) {
    if (key) maps[key] = entry;
  }
}

const DISH_NAMES: Record<string, LocaleMap> = {};
const DISH_DESCRIPTIONS: Record<string, LocaleMap> = {};

for (const [ka, translated] of Object.entries(DISH_I18N)) {
  const names: LocaleMap = {
    ka,
    en: translated.en.name,
    ru: translated.ru.name,
  };
  const descriptions: LocaleMap = {
    en: translated.en.description,
    ru: translated.ru.description,
  };
  aliasLocaleMap(DISH_NAMES, names, ka, translated.en.name, translated.ru.name);
  aliasLocaleMap(
    DISH_DESCRIPTIONS,
    descriptions,
    ka,
    translated.en.name,
    translated.ru.name,
  );
}

const CATEGORY_NAMES: Record<string, LocaleMap> = {};
const CATEGORY_I18N: Record<string, { ka: string; ru: string }> = {
  "Cold Starters": { ka: "ცივი საუზმეები", ru: "Холодные закуски" },
  Salads: { ka: "სალათები", ru: "Салаты" },
  Soups: { ka: "სუპები", ru: "Супы" },
  Khachapuri: { ka: "ხაჭაპური", ru: "Хачапури" },
  Khinkali: { ka: "ხინკალი", ru: "Хинкали" },
  "Main Dishes": { ka: "ძირითადი კერძები", ru: "Основные блюда" },
  Grill: { ka: "მწვადი", ru: "Мангал" },
  Fish: { ka: "თევზი", ru: "Рыба" },
  Vegetarian: { ka: "ვეგეტარიანული", ru: "Вегетарианское" },
  Sides: { ka: "გარნირები", ru: "Гарниры" },
  Bread: { ka: "პური", ru: "Хлеб" },
  Desserts: { ka: "დესერტები", ru: "Десерты" },
  "Soft Drinks": { ka: "უალკოჰოლო სასმელები", ru: "Безалкогольные" },
  Wine: { ka: "ღვინო", ru: "Вино" },
  "Beer & Spirits": { ka: "ლუდი და სპირტიანი", ru: "Пиво и крепкие" },
  Drinks: { ka: "სასმელები", ru: "Напитки" },
};

for (const [en, translated] of Object.entries(CATEGORY_I18N)) {
  const entry: LocaleMap = { en, ka: translated.ka, ru: translated.ru };
  aliasLocaleMap(CATEGORY_NAMES, entry, en, translated.ka, translated.ru);
}

const ALLERGENS: Record<string, Record<MenuLocale, string>> = {
  gluten: { ka: "გლუტენი", en: "gluten", ru: "глютен" },
  dairy: { ka: "რძის პროდუქტი", en: "dairy", ru: "молочные" },
  eggs: { ka: "კვერცხი", en: "eggs", ru: "яйца" },
  nuts: { ka: "თხილეული", en: "nuts", ru: "орехи" },
  sulfites: { ka: "სულფიტები", en: "sulfites", ru: "сульфиты" },
  fish: { ka: "თევზი", en: "fish", ru: "рыба" },
  shellfish: { ka: "ზღვის პროდუქტი", en: "shellfish", ru: "моллюски" },
};

const TABLE_NUMBER_PREFIX =
  /^(მაგიდა|table|стол|طاولة)\s+/i;

export function formatGuestTableLabel(
  label: string,
  tableNumber: string | null | undefined,
) {
  const raw = tableNumber?.trim();
  if (!raw) return "—";
  const number = raw.replace(TABLE_NUMBER_PREFIX, "").trim() || raw;
  return `${label} ${number}`;
}

export const ui = {
  ka: {
    all: "ყველა",
    table: "მაგიდა",
    language: "ენა",
    addToCart: "კალათაში დამატება",
    decreaseQty: "რაოდენობის შემცირება",
    increaseQty: "რაოდენობის გაზრდა",
    soldOut: "ამოიწურა",
    remove: "წაშლა",
    unavailable: "მიუწვდომელია",
    ingredients: "ინგრედიენტები",
    emptyCategory: "ამ კატეგორიაში კერძები ჯერ არ არის.",
    menuEmpty: "მენიუ ცარიელია 🍽️",
    searchPlaceholder: "მოძებნეთ კერძი, ინგრედიენტი...",
    searchAria: "კერძის ძიება",
    hostAskCta: "ჰკითხე შეფ-ასისტენტს ✨",
    hostCloudDish: "გინდა დაგეხმარო კერძის შერჩევაში? ✨",
    hostCloudWine: "გსურს შესაბამისი ღვინო შევუხამოთ თქვენს შეკვეთას? 🍷",
    hostCloudDiet: "გაქვთ სპეციალური დიეტური მოთხოვნა? 🛡️",
    searchClear: "ძიების გასუფთავება",
    searchEmpty: "კერძი ვერ მოიძებნა 🍽️",
    translatingMenu: "მენიუ ითარგმნება…",
    cartEmpty: "კალათა ცარიელია",
    cartHint: "დაამატეთ კერძები ამ მაგიდიდან",
    items: (n: number) => `${n} პოზიცია`,
    aiAssistant: "შეფ-ასისტენტი",
    checkout: "მიმტანის გამოძახება",
    yourOrder: "თქვენი არჩევანი",
    addFromMenu: "დაამატეთ კერძები მენიუდან.",
    cartEmptyLong: "სია ცარიელია — მიმტანი მაინც მოვა.",
    total: "ჯამი",
    dishesSubtotal: "კერძების ჯამი",
    serviceFee: (percent: number) => `მომსახურება (${percent}%)`,
    grandTotalDue: "სულ გადასახდელი",
    placeOrder: "მიმტანის გამოძახება",
    sending: "იგზავნება…",
    callWaiter: "მიმტანის გამოძახება",
    callWaiterWithItems: "მიმტანის გამოძახება არჩეული კერძებით",
    requestTitle: "როგორ დაგეხმაროთ?",
    requestHint: "აირჩიეთ მოთხოვნა — მიმტანი მიიღებს შეტყობინებას.",
    requestSent: "მოთხოვნა გაგზავნილია!",
    boughtTogether: "ხშირად უკვეთავენ ერთად 🍷",
    chefTip: "შეფ-მზარეულის რჩევა 👨‍🍳",
    addUpsell: "➕ დამატება",
    summaryHint:
      "აჩვენეთ ეს სია მიმტანს, როცა მოვა. შეკვეთა სამზარეულოში არ იგზავნება.",
    callSent: "მიმტანი გამოძახებულია. აჩვენეთ ეს სია, როცა მოვა.",
    callFail: "გამოძახება ვერ გაიგზავნა. სცადეთ თავიდან.",
    each: "ცალი",
    noTable: "მაგიდა არ არის",
    chefAssistant: "შეფ-ასისტენტი",
    chefWidgetBubble:
      "გინდა დაგეხმარო კერძის არჩევაში? მკითხე რაც მოგესურვება!",
    waiterTitle: "შეფ-ასისტენტი",
    waiterIntro: (name: string) =>
      `კეთილი იყოს თქვენი მობრძანება ${name}-ში. მე ვარ თქვენი შეფ-ასისტენტი — სიამოვნებით დაგეხმარებით მენიუში, ალერგენებსა და ქვევრის ღვინის შეხამებაში.`,
    hostBannerBefore: "გამარჯობა! მე ვარ თქვენი ",
    hostBannerName: "შეფ-ასისტენტი",
    hostBannerAfter:
      ". დაგეხმარებით კერძის, ალერგენების ან შესაბამისი ღვინის შერჩევაში ✨",
    waiterPlaceholder: "იკითხეთ კერძზე, ალერგენზე ან ღვინოზე…",
    thinking: "ვფიქრობ…",
    sendChat: "გაგზავნა",
    apiError: "API შეცდომა: OpenAI გასაღები აკლია ან ნაკადი ვერ გაიგზავნა.",
    vegetarian: "🌱 ვეგეტარიანული",
    wine: "🍷 ღვინის შეხამება",
    spicy: "🌶️ ცხარე კერძები",
    vegetarianPrompt: "რა ვეგეტარიანული ვარიანტები გაქვთ?",
    winePrompt: "რა ღვინო შეხამდება ძირითად კერძებთან?",
    spicyPrompt: "რომელი კერძებია ცხარე?",
    orderOk: (table: string, id: string) =>
      `შეკვეთა მიღებულია, ${table}. სამზარეულოს ბილეთი #${id}.`,
    orderFail: "შეკვეთა ვერ გაიგზავნა. სცადეთ თავიდან.",
    feedbackTitle: "როგორ შეაფასებდით დღევანდელ მომსახურებას? ⭐⭐⭐⭐⭐",
    feedbackPositive:
      "გმადლობთ შეფასებისთვის! გთხოვთ დაგვიტოვოთ შეფასება Google-ზეც 🌟",
    feedbackGoogle: "⭐ Google-ზე შეფასება",
    feedbackNegativePrompt:
      "გთხოვთ გვითხრათ, რა არ მოგეწონათ, რომ გამოსწორება შევძლოთ:",
    feedbackSubmit: "გაგზავნა",
    feedbackThanks:
      "მადლობა! მენეჯერი უკვე გაფრთხილებულია და მოვა თქვენთან.",
    feedbackSkip: "ახლა არა",
  },
  en: {
    all: "All",
    table: "Table",
    language: "Language",
    addToCart: "Add to Cart",
    decreaseQty: "Decrease quantity",
    increaseQty: "Increase quantity",
    soldOut: "Sold out",
    remove: "Remove",
    unavailable: "Unavailable",
    ingredients: "Ingredients",
    emptyCategory: "No dishes in this category yet.",
    menuEmpty: "The menu is empty 🍽️",
    searchPlaceholder: "Search a dish, ingredient...",
    searchAria: "Search dishes",
    hostAskCta: "ჰკითხე შეფ-ასისტენტს ✨",
    hostCloudDish: "გინდა დაგეხმარო კერძის შერჩევაში? ✨",
    hostCloudWine: "გსურს შესაბამისი ღვინო შევუხამოთ თქვენს შეკვეთას? 🍷",
    hostCloudDiet: "გაქვთ სპეციალური დიეტური მოთხოვნა? 🛡️",
    searchClear: "Clear search",
    searchEmpty: "No dishes found 🍽️",
    translatingMenu: "Translating menu…",
    cartEmpty: "Cart is empty",
    cartHint: "Add dishes to order from this table",
    items: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
    aiAssistant: "Chef Assistant",
    checkout: "Call Waiter",
    yourOrder: "Your selection",
    addFromMenu: "Add dishes from the menu.",
    cartEmptyLong: "No dishes selected yet — the waiter can still come by.",
    total: "Total",
    dishesSubtotal: "Dishes subtotal",
    serviceFee: (percent: number) => `Service (${percent}%)`,
    grandTotalDue: "Amount due",
    placeOrder: "Call Waiter",
    sending: "Calling…",
    callWaiter: "Call waiter",
    callWaiterWithItems: "Call waiter with selected items",
    requestTitle: "How can we help?",
    requestHint: "Choose a request — the waiter will be notified.",
    requestSent: "Request sent!",
    boughtTogether: "Frequently ordered together 🍷",
    chefTip: "Chef's tip 👨‍🍳",
    addUpsell: "➕ დამატება",
    summaryHint:
      "Show this list to the waiter when they arrive. Nothing is sent to the kitchen from here.",
    callSent: "Waiter called. Show this list when they arrive.",
    callFail: "Could not call the waiter. Try again.",
    each: "each",
    noTable: "No table",
    chefAssistant: "Chef Assistant",
    chefWidgetBubble:
      "Need help choosing a dish? Ask me anything you like!",
    waiterTitle: "Chef Assistant",
    waiterIntro: (name: string) =>
      `Welcome to ${name}. I am your შეფ-ასისტენტი — here to guide you through the menu, allergens, and a glass of qvevri wine.`,
    hostBannerBefore: "გამარჯობა! მე ვარ თქვენი ",
    hostBannerName: "შეფ-ასისტენტი",
    hostBannerAfter:
      ". დაგეხმარებით კერძის, ალერგენების ან შესაბამისი ღვინის შერჩევაში ✨",
    waiterPlaceholder: "Ask about a dish, allergen, or pairing…",
    thinking: "Thinking…",
    sendChat: "Send",
    apiError: "API Error: OpenAI Key missing or stream failed",
    vegetarian: "🌱 Vegetarian options",
    wine: "🍷 Wine pairing",
    spicy: "🌶️ Spicy dishes",
    vegetarianPrompt: "What vegetarian options do you have?",
    winePrompt: "What wine pairing would you recommend with the mains?",
    spicyPrompt: "Which dishes are spicy or have a kick?",
    orderOk: (table: string, id: string) =>
      `Order confirmed for ${table}. Kitchen ticket #${id}.`,
    orderFail: "Could not send the order. Try again.",
    feedbackTitle: "როგორ შეაფასებდით დღევანდელ მომსახურებას? ⭐⭐⭐⭐⭐",
    feedbackPositive:
      "Thank you for the rating! Please leave a review on Google too 🌟",
    feedbackGoogle: "⭐ Google-ზე შეფასება",
    feedbackNegativePrompt:
      "გთხოვთ გვითხრათ, რა არ მოგეწონათ, რომ გამოსწორება შევძლოთ:",
    feedbackSubmit: "გაგზავნა",
    feedbackThanks:
      "მადლობა! მენეჯერი უკვე გაფრთხილებულია და მოვა თქვენთან.",
    feedbackSkip: "ახლა არა",
  },
  ru: {
    all: "Все",
    table: "Стол",
    language: "Язык",
    addToCart: "В корзину",
    decreaseQty: "Уменьшить количество",
    increaseQty: "Увеличить количество",
    soldOut: "Нет в наличии",
    remove: "Удалить",
    unavailable: "Недоступно",
    ingredients: "Ингредиенты",
    emptyCategory: "В этой категории пока нет блюд.",
    menuEmpty: "Меню пусто 🍽️",
    searchPlaceholder: "Найти блюдо, ингредиент...",
    searchAria: "Поиск блюд",
    hostAskCta: "ჰკითხე შეფ-ასისტენტს ✨",
    hostCloudDish: "გინდა დაგეხმარო კერძის შერჩევაში? ✨",
    hostCloudWine: "გსურს შესაბამისი ღვინო შევუხამოთ თქვენს შეკვეთას? 🍷",
    hostCloudDiet: "გაქვთ სპეციალური დიეტური მოთხოვნა? 🛡️",
    searchClear: "Очистить поиск",
    searchEmpty: "Блюдо не найдено 🍽️",
    translatingMenu: "Перевод меню…",
    cartEmpty: "Корзина пуста",
    cartHint: "Добавьте блюда с этого стола",
    items: (n: number) => `${n} поз.`,
    aiAssistant: "Шеф-помощник",
    checkout: "Позвать официанта",
    yourOrder: "Ваш выбор",
    addFromMenu: "Добавьте блюда из меню.",
    cartEmptyLong: "Список пуст — официант всё равно подойдёт.",
    total: "Итого",
    dishesSubtotal: "Сумма блюд",
    serviceFee: (percent: number) => `Обслуживание (${percent}%)`,
    grandTotalDue: "К оплате",
    placeOrder: "Позвать официанта",
    sending: "Вызов…",
    callWaiter: "Позвать официанта",
    callWaiterWithItems: "Позвать официанта с выбранными блюдами",
    requestTitle: "Чем помочь?",
    requestHint: "Выберите запрос — официант получит уведомление.",
    requestSent: "Запрос отправлен!",
    boughtTogether: "Часто заказывают вместе 🍷",
    chefTip: "Совет шефа 👨‍🍳",
    addUpsell: "➕ დამატება",
    summaryHint:
      "Покажите этот список официанту. На кухню заказ отсюда не уходит.",
    callSent: "Официант вызван. Покажите список, когда подойдёт.",
    callFail: "Не удалось вызвать официанта. Попробуйте ещё раз.",
    each: "шт.",
    noTable: "Нет стола",
    chefAssistant: "Шеф-помощник",
    chefWidgetBubble:
      "Нужна помощь с выбором блюда? Спросите меня о чём угодно!",
    waiterTitle: "Шеф-помощник",
    waiterIntro: (name: string) =>
      `Добро пожаловать в ${name}. Я ваш შეფ-ასისტენტი — с радостью помогу с меню, аллергенами и вином из квеври.`,
    hostBannerBefore: "გამარჯობა! მე ვარ თქვენი ",
    hostBannerName: "შეფ-ასისტენტი",
    hostBannerAfter:
      ". დაგეხმარებით კერძის, ალერგენების ან შესაბამისი ღვინის შერჩევაში ✨",
    waiterPlaceholder: "Спросите про блюдо, аллерген или вино…",
    thinking: "Думаю…",
    sendChat: "Отправить",
    apiError: "Ошибка API: нет ключа OpenAI или сбой потока.",
    vegetarian: "🌱 Вегетарианское",
    wine: "🍷 Вино",
    spicy: "🌶️ Острое",
    vegetarianPrompt: "Какие у вас вегетарианские блюда?",
    winePrompt: "Какое вино подойдёт к основным блюдам?",
    spicyPrompt: "Какие блюда острые?",
    orderOk: (table: string, id: string) =>
      `Заказ принят, ${table}. Кухня #${id}.`,
    orderFail: "Не удалось отправить заказ. Попробуйте ещё раз.",
    feedbackTitle: "როგორ შეაფასებდით დღევანდელ მომსახურებას? ⭐⭐⭐⭐⭐",
    feedbackPositive:
      "Спасибо за оценку! Пожалуйста, оставьте отзыв и в Google 🌟",
    feedbackGoogle: "⭐ Google-ზე შეფასება",
    feedbackNegativePrompt:
      "გთხოვთ გვითხრათ, რა არ მოგეწონათ, რომ გამოსწორება შევძლოთ:",
    feedbackSubmit: "გაგზავნა",
    feedbackThanks:
      "მადლობა! მენეჯერი უკვე გაფრთხილებულია და მოვა თქვენთან.",
    feedbackSkip: "ახლა არა",
  },
} as const;

const INGREDIENT_NAMES: Record<string, LocaleMap> = {};
for (const [key, entry] of Object.entries(INGREDIENT_I18N)) {
  const mapped: LocaleMap = { ...entry, ka: entry.ka ?? key };
  aliasLocaleMap(INGREDIENT_NAMES, mapped, key, entry.ka, entry.en, entry.ru);
}

const runtimeOverlay: Record<"en" | "ru", Record<string, string>> = {
  en: {},
  ru: {},
};

const CACHE_KEY = "smart-ai-menu-tx-v3";
const STALE_CACHE_KEYS = ["smart-ai-menu-tx-v1", "smart-ai-menu-tx-v2"];
let storedTranslationsLoaded = false;

export function hasGeorgianScript(text: string) {
  return /[\u10A0-\u10FF]/.test(text);
}

function usableTranslation(value: string | undefined, locale: MenuLocale) {
  if (!value?.trim()) return undefined;
  if (locale !== "ka" && hasGeorgianScript(value)) return undefined;
  return value;
}

export function loadStoredMenuTranslations() {
  if (storedTranslationsLoaded || typeof window === "undefined") return;
  storedTranslationsLoaded = true;
  try {
    for (const key of STALE_CACHE_KEYS) {
      window.localStorage.removeItem(key);
    }
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<typeof runtimeOverlay>;
    for (const locale of ["en", "ru"] as const) {
      const incoming = parsed[locale] ?? {};
      for (const [source, translated] of Object.entries(incoming)) {
        if (usableTranslation(translated, locale)) {
          runtimeOverlay[locale][source] = translated;
        }
      }
    }
  } catch {
    /* ignore */
  }
}

export function applyMenuTranslations(
  locale: "en" | "ru",
  map: Record<string, string>,
) {
  const next = { ...runtimeOverlay[locale] };
  for (const [source, translated] of Object.entries(map)) {
    if (usableTranslation(translated, locale)) next[source] = translated;
  }
  runtimeOverlay[locale] = next;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(runtimeOverlay));
  } catch {
    /* ignore quota */
  }
}

function overlayLookup(original: string, locale: MenuLocale) {
  if (locale === "ka") return undefined;
  const table = runtimeOverlay[locale];
  return usableTranslation(
    table[original] || table[original.trim()],
    locale,
  );
}

function dictLookup(
  original: string,
  locale: MenuLocale,
  dictionary: Record<string, LocaleMap>,
) {
  const trimmed = original.trim();
  const entry =
    dictionary[original] ||
    dictionary[trimmed] ||
    dictionary[trimmed.toLowerCase()];
  return entry?.[locale];
}

export function localizeName(
  original: string,
  locale: MenuLocale,
  dictionary: Record<string, Partial<Record<MenuLocale, string>>>,
) {
  const fromDict = dictLookup(original, locale, dictionary);
  if (fromDict) return fromDict;
  const fromOverlay = overlayLookup(original, locale);
  if (fromOverlay) return fromOverlay;
  return original;
}

export function dishLabel(name: string, locale: MenuLocale) {
  return localizeName(name, locale, DISH_NAMES);
}

export function dishDescription(
  name: string,
  fallback: string,
  locale: MenuLocale,
) {
  const entry =
    DISH_DESCRIPTIONS[name] ||
    DISH_DESCRIPTIONS[name.trim()] ||
    DISH_DESCRIPTIONS[fallback] ||
    DISH_DESCRIPTIONS[fallback.trim()];
  if (locale === "ka") {
    return fallback || entry?.ka || name;
  }
  if (entry?.[locale]) return entry[locale];
  const fromOverlay =
    overlayLookup(fallback, locale) || overlayLookup(name, locale);
  if (fromOverlay) return fromOverlay;
  return "";
}

export function categoryLabel(name: string, locale: MenuLocale) {
  return localizeName(name, locale, CATEGORY_NAMES);
}

export function allergenLabel(name: string, locale: MenuLocale) {
  return (
    ALLERGENS[name.toLowerCase()]?.[locale] ||
    overlayLookup(name, locale) ||
    name
  );
}

export function ingredientLabel(name: string, locale: MenuLocale) {
  return localizeName(name, locale, INGREDIENT_NAMES);
}

export function staticMenuTranslation(text: string, locale: MenuLocale) {
  const value = text.trim();
  if (!value || locale === "ka") return null;
  return (
    usableTranslation(dictLookup(value, locale, DISH_NAMES), locale) ||
    usableTranslation(dictLookup(value, locale, CATEGORY_NAMES), locale) ||
    usableTranslation(dictLookup(value, locale, INGREDIENT_NAMES), locale) ||
    usableTranslation(ALLERGENS[value.toLowerCase()]?.[locale], locale) ||
    overlayLookup(value, locale) ||
    null
  );
}

export function needsLiveTranslation(text: string, locale: MenuLocale) {
  const value = text.trim();
  if (!value || locale === "ka") return false;
  if (hasGeorgianScript(value)) return true;
  if (staticMenuTranslation(value, locale)) return false;
  if (locale === "en" && /^[\x00-\x7F]+$/.test(value)) return false;
  if (locale === "ru" && /[\u0400-\u04FF]/.test(value)) return false;
  return true;
}

export function formatGel(amount: number) {
  return `₾${Number(amount).toFixed(2)}`;
}
