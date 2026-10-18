import type { StoreData } from "@/types/database";

const now = "2026-09-15T10:00:00.000Z";

export const DEMO_RESTAURANT_ID = "demo";

export function createSeed(): StoreData {
  return {
    restaurants: [
      {
        id: DEMO_RESTAURANT_ID,
        name: "Aurora Bistro",
        logo: null,
        created_at: now,
      },
    ],
    tables: Array.from({ length: 8 }, (_, i) => ({
      id: `table-${i + 1}`,
      restaurant_id: DEMO_RESTAURANT_ID,
      table_number: String(i + 1),
    })),
    categories: [
      {
        id: "starters",
        restaurant_id: DEMO_RESTAURANT_ID,
        name: "Starters",
        order_index: 0,
        translations: {
          en: "Starters",
          ar: "المقبلات",
          ru: "Закуски",
          fr: "Entrées",
        },
      },
      {
        id: "mains",
        restaurant_id: DEMO_RESTAURANT_ID,
        name: "Mains",
        order_index: 1,
        translations: {
          en: "Mains",
          ar: "الأطباق الرئيسية",
          ru: "Основные блюда",
          fr: "Plats",
        },
      },
      {
        id: "desserts",
        restaurant_id: DEMO_RESTAURANT_ID,
        name: "Desserts",
        order_index: 2,
        translations: {
          en: "Desserts",
          ar: "الحلويات",
          ru: "Десерты",
          fr: "Desserts",
        },
      },
      {
        id: "drinks",
        restaurant_id: DEMO_RESTAURANT_ID,
        name: "Drinks & Wine",
        order_index: 3,
        translations: {
          en: "Drinks & Wine",
          ar: "المشروبات والنبيذ",
          ru: "Напитки и вино",
          fr: "Boissons et vins",
        },
      },
    ],
    dishes: [
      {
        id: "burrata",
        category_id: "starters",
        name: "Heirloom Burrata",
        description:
          "Creamy burrata, roasted peaches, basil oil, and grilled sourdough.",
        price: 14,
        margin_score: 8,
        image_url:
          "https://images.unsplash.com/photo-1608897013039-887f21dba900?auto=format&fit=crop&w=1200&q=80",
        allergens: ["dairy", "gluten"],
        ingredients: ["burrata", "peach", "basil", "sourdough"],
        is_available: true,
        wine_pairing: "Prosecco or Sauvignon Blanc",
        translations: {
          en: {
            name: "Heirloom Burrata",
            description:
              "Creamy burrata, roasted peaches, basil oil, and grilled sourdough.",
          },
          ar: {
            name: "بوراتا الموسم",
            description: "بوراتا كريمية مع خوخ مشوي وزيت ريحان وخبز محمص.",
          },
          ru: {
            name: "Буррата с персиками",
            description: "Сливочная буррата, печёные персики, масло базилика.",
          },
          fr: {
            name: "Burrata héritage",
            description:
              "Burrata crémeuse, pêches rôties, huile de basilic et pain grillé.",
          },
        },
      },
      {
        id: "tuna",
        category_id: "starters",
        name: "Citrus Tuna Crudo",
        description: "Yellowfin tuna, yuzu, fennel, chili, and olive oil.",
        price: 18,
        margin_score: 9,
        image_url:
          "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=1200&q=80",
        allergens: ["fish"],
        ingredients: ["tuna", "yuzu", "fennel", "chili"],
        is_available: true,
        wine_pairing: "Albariño",
        translations: {
          en: {
            name: "Citrus Tuna Crudo",
            description: "Yellowfin tuna, yuzu, fennel, chili, and olive oil.",
          },
          ar: {
            name: "تونة كرودو بالحمضيات",
            description: "تونة صفراء مع يوزو والشمر والفلفل وزيت الزيتون.",
          },
          ru: {
            name: "Крудо из тунца",
            description: "Тунец, юдзу, фенхель и перец чили.",
          },
          fr: {
            name: "Crudo de thon agrumes",
            description: "Thon albacore, yuzu, fenouil, piment et huile d'olive.",
          },
        },
      },
      {
        id: "salad",
        category_id: "starters",
        name: "Garden Crunch Salad",
        description:
          "Seasonal greens, cucumber, herbs, toasted seeds, lemon dressing.",
        price: 12,
        margin_score: 7,
        image_url:
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
        allergens: ["seeds"],
        ingredients: ["greens", "cucumber", "herbs", "seeds", "lemon"],
        is_available: true,
        wine_pairing: "Grüner Veltliner",
        translations: {
          en: {
            name: "Garden Crunch Salad",
            description:
              "Seasonal greens, cucumber, herbs, toasted seeds, lemon dressing.",
          },
          ar: {
            name: "سلطة الحديقة",
            description: "خضار موسمية، خيار، أعشاب، بذور وتحميرة الليمون.",
          },
          ru: {
            name: "Салат Garden Crunch",
            description: "Зелень, огурец, травы, семечки и лимонная заправка.",
          },
          fr: {
            name: "Salade croquante du jardin",
            description:
              "Verts de saison, concombre, herbes, graines et vinaigrette citron.",
          },
        },
      },
      {
        id: "steak",
        category_id: "mains",
        name: "Charred Ribeye",
        description:
          "300g ribeye, bone marrow butter, rosemary potatoes, pepper jus.",
        price: 42,
        margin_score: 6,
        image_url:
          "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=80",
        allergens: ["dairy"],
        ingredients: ["ribeye", "butter", "potato", "rosemary"],
        is_available: true,
        wine_pairing: "Malbec or Cabernet Sauvignon",
        translations: {
          en: {
            name: "Charred Ribeye",
            description:
              "300g ribeye, bone marrow butter, rosemary potatoes, pepper jus.",
          },
          ar: {
            name: "ريب آي مشوي",
            description: "ريب آي 300غ مع زبدة ونخاع، بطاطا روزماري وصلصة فلفل.",
          },
          ru: {
            name: "Рибай на углях",
            description: "Рибай 300 г, масло с костным мозгом, картофель.",
          },
          fr: {
            name: "Ribeye grillé",
            description:
              "Ribeye 300 g, beurre à la moelle, pommes de terre au romarin.",
          },
        },
      },
      {
        id: "sea-bass",
        category_id: "mains",
        name: "Herb Sea Bass",
        description:
          "Pan-seared sea bass, saffron broth, fennel, and charred lemon.",
        price: 34,
        margin_score: 8,
        image_url:
          "https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=1200&q=80",
        allergens: ["fish"],
        ingredients: ["sea bass", "saffron", "fennel", "lemon"],
        is_available: true,
        wine_pairing: "Chablis",
        translations: {
          en: {
            name: "Herb Sea Bass",
            description:
              "Pan-seared sea bass, saffron broth, fennel, and charred lemon.",
          },
          ar: {
            name: "قاروص بالأعشاب",
            description: "قاروص مقلي مع مرق الزعفران والشمر والليمون.",
          },
          ru: {
            name: "Сибас с травами",
            description: "Сибас, шафрановый бульон, фенхель и лимон.",
          },
          fr: {
            name: "Bar aux herbes",
            description: "Bar poêlé, bouillon safran, fenouil et citron grillé.",
          },
        },
      },
      {
        id: "risotto",
        category_id: "mains",
        name: "Truffle Mushroom Risotto",
        description:
          "Carnaroli rice, wild mushrooms, parmesan, black truffle oil.",
        price: 28,
        margin_score: 10,
        image_url:
          "https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=1200&q=80",
        allergens: ["dairy"],
        ingredients: ["rice", "mushroom", "parmesan", "truffle"],
        is_available: true,
        wine_pairing: "Pinot Noir",
        translations: {
          en: {
            name: "Truffle Mushroom Risotto",
            description:
              "Carnaroli rice, wild mushrooms, parmesan, black truffle oil.",
          },
          ar: {
            name: "ريزوتو الفطر والكمأة",
            description: "أرز كارنارولي، فطر بري، بارميزان وزيت الكمأة.",
          },
          ru: {
            name: "Ризотто с трюфелем",
            description: "Рис карнароли, грибы, пармезан и трюфельное масло.",
          },
          fr: {
            name: "Risotto aux champignons et truffe",
            description:
              "Riz carnaroli, champignons, parmesan et huile de truffe.",
          },
        },
      },
      {
        id: "chicken",
        category_id: "mains",
        name: "Lemon Thyme Chicken",
        description: "Roasted half chicken, pan juices, grilled zucchini.",
        price: 24,
        margin_score: 7,
        image_url:
          "https://images.unsplash.com/photo-1598103442097-8b70429469aa?auto=format&fit=crop&w=1200&q=80",
        allergens: [],
        ingredients: ["chicken", "lemon", "thyme", "zucchini"],
        is_available: false,
        wine_pairing: "Chardonnay",
        translations: {
          en: {
            name: "Lemon Thyme Chicken",
            description: "Roasted half chicken, pan juices, grilled zucchini.",
          },
          ar: {
            name: "دجاج بالليمون والزعتر",
            description: "نصف دجاجة مشوية مع عصارة المقلاة وكوسا.",
          },
          ru: {
            name: "Курица с лимоном и тимьяном",
            description: "Запечённая курица, сок с противня, цукини.",
          },
          fr: {
            name: "Poulet citron-thym",
            description: "Demi-poulet rôti, jus de cuisson et courgettes.",
          },
        },
      },
      {
        id: "lava",
        category_id: "desserts",
        name: "Dark Chocolate Lava",
        description: "Warm fondant, vanilla gelato, sea salt.",
        price: 13,
        margin_score: 9,
        image_url:
          "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=80",
        allergens: ["dairy", "gluten", "eggs"],
        ingredients: ["chocolate", "butter", "egg", "vanilla"],
        is_available: true,
        wine_pairing: "Late harvest Riesling or espresso",
        translations: {
          en: {
            name: "Dark Chocolate Lava",
            description: "Warm fondant, vanilla gelato, sea salt.",
          },
          ar: {
            name: "لافـا الشوكولاتة",
            description: "فوندان دافئ مع جيلاتو الفانيليا وملح البحر.",
          },
          ru: {
            name: "Шоколадный фондан",
            description: "Тёплый фондан, ванильное джелато, морская соль.",
          },
          fr: {
            name: "Moelleux au chocolat",
            description: "Fondant chaud, gelato vanille et fleur de sel.",
          },
        },
      },
      {
        id: "panna",
        category_id: "desserts",
        name: "Honey Panna Cotta",
        description: "Set cream, thyme honey, crushed pistachio.",
        price: 11,
        margin_score: 10,
        image_url:
          "https://images.unsplash.com/photo-1488477181946-6428a292623f?auto=format&fit=crop&w=1200&q=80",
        allergens: ["dairy", "nuts"],
        ingredients: ["cream", "honey", "pistachio"],
        is_available: true,
        wine_pairing: "Moscato d'Asti",
        translations: {
          en: {
            name: "Honey Panna Cotta",
            description: "Set cream, thyme honey, crushed pistachio.",
          },
          ar: {
            name: "بانا كوتا بالعسل",
            description: "كريمة مع عسل الزعتر وفستق مطحون.",
          },
          ru: {
            name: "Панна котта с мёдом",
            description: "Сливки, тимьяновый мёд и фисташки.",
          },
          fr: {
            name: "Panna cotta au miel",
            description: "Crème prise, miel de thym et pistache concassée.",
          },
        },
      },
      {
        id: "malbec",
        category_id: "drinks",
        name: "House Malbec",
        description: "Glass of Mendoza malbec — dark fruit and cocoa.",
        price: 11,
        margin_score: 9,
        image_url:
          "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
        allergens: ["sulfites"],
        ingredients: ["malbec"],
        is_available: true,
        wine_pairing: "Pairs with ribeye and risotto",
        translations: {
          en: {
            name: "House Malbec",
            description: "Glass of Mendoza malbec — dark fruit and cocoa.",
          },
          ar: {
            name: "مالبيك الدار",
            description: "كأس مالبيك من مندوزا — فواكه داكنة وكاكاو.",
          },
          ru: {
            name: "Мальбек домашний",
            description: "Бокал мальбека из Мендосы — тёмные ягоды и какао.",
          },
          fr: {
            name: "Malbec de la maison",
            description: "Verre de malbec de Mendoza — fruits noirs et cacao.",
          },
        },
      },
      {
        id: "spritz",
        category_id: "drinks",
        name: "Citrus Spritz",
        description: "Prosecco, bitter orange, soda, olive.",
        price: 10,
        margin_score: 11,
        image_url:
          "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80",
        allergens: ["sulfites"],
        ingredients: ["prosecco", "orange", "soda"],
        is_available: true,
        wine_pairing: "Aperitif before starters",
        translations: {
          en: {
            name: "Citrus Spritz",
            description: "Prosecco, bitter orange, soda, olive.",
          },
          ar: {
            name: "سبريتز الحمضيات",
            description: "بروسيكو، برتقال مر، صودا وزيتون.",
          },
          ru: {
            name: "Цитрусовый шприц",
            description: "Просекко, горький апельсин, содовая, оливка.",
          },
          fr: {
            name: "Spritz agrumes",
            description: "Prosecco, orange amère, soda et olive.",
          },
        },
      },
      {
        id: "mocktail",
        category_id: "drinks",
        name: "Garden Cooler",
        description: "Cucumber, mint, lime, sparkling water — no alcohol.",
        price: 7,
        margin_score: 12,
        image_url:
          "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80",
        allergens: [],
        ingredients: ["cucumber", "mint", "lime"],
        is_available: true,
        wine_pairing: "Non-alcoholic pairing for salad and sea bass",
        translations: {
          en: {
            name: "Garden Cooler",
            description: "Cucumber, mint, lime, sparkling water — no alcohol.",
          },
          ar: {
            name: "مبرد الحديقة",
            description: "خيار، نعناع، ليمون وماء فوار — بدون كحول.",
          },
          ru: {
            name: "Garden Cooler",
            description: "Огурец, мята, лайм и газировка — без алкоголя.",
          },
          fr: {
            name: "Garden Cooler",
            description:
              "Concombre, menthe, citron vert et eau pétillante — sans alcool.",
          },
        },
      },
    ],
    orders: [
      {
        id: "ord-seed-1",
        restaurant_id: DEMO_RESTAURANT_ID,
        table_id: "table-3",
        status: "preparing",
        items: [
          {
            dish_id: "risotto",
            name: "Truffle Mushroom Risotto",
            quantity: 1,
            unit_price: 28,
          },
          {
            dish_id: "spritz",
            name: "Citrus Spritz",
            quantity: 2,
            unit_price: 10,
          },
        ],
        total_amount: 48,
        mood: "romantic",
        created_at: "2026-09-15T11:40:00.000Z",
        updated_at: "2026-09-15T11:42:00.000Z",
      },
    ],
    reviews: [
      {
        id: "rev-1",
        restaurant_id: DEMO_RESTAURANT_ID,
        table_id: "table-2",
        rating: 5,
        feedback: "The sea bass was perfect.",
        created_at: "2026-09-14T18:00:00.000Z",
        mitigated: false,
      },
      {
        id: "rev-2",
        restaurant_id: DEMO_RESTAURANT_ID,
        table_id: "table-5",
        rating: 2,
        feedback: "Waited too long and the chicken was unavailable.",
        created_at: "2026-09-14T20:10:00.000Z",
        mitigated: true,
      },
    ],
  };
}
