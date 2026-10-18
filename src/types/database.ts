export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export type Lang = "ka" | "en" | "ar" | "ru" | "fr";

export type Mood =
  | "classic"
  | "romantic"
  | "hungry"
  | "healthy"
  | "celebrating";

export type Restaurant = {
  id: string;
  name: string;
  logo: string | null;
  created_at: string;
};

export type Table = {
  id: string;
  restaurant_id: string;
  table_number: string;
};

export type Category = {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number;
  translations: { en: string } & Partial<Record<Lang, string>>;
};

export type Dish = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  margin_score: number;
  image_url: string | null;
  allergens: string[];
  ingredients: string[];
  is_available: boolean;
  wine_pairing: string;
  translations: { en: { name: string; description: string } } & Partial<
    Record<Lang, { name: string; description: string }>
  >;
};

export type OrderItem = {
  dish_id: string;
  name: string;
  quantity: number;
  unit_price: number;
};

export type Order = {
  id: string;
  restaurant_id: string;
  table_id: string;
  status: OrderStatus;
  items: OrderItem[];
  total_amount: number;
  mood: Mood | null;
  created_at: string;
  updated_at: string;
};

export type Review = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  rating: number;
  feedback: string;
  created_at: string;
  mitigated: boolean;
};

export type StoreData = {
  restaurants: Restaurant[];
  tables: Table[];
  categories: Category[];
  dishes: Dish[];
  orders: Order[];
  reviews: Review[];
};
