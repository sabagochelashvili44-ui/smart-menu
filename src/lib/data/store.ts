import { promises as fs } from "node:fs";
import path from "node:path";
import { createSeed } from "@/lib/data/seed";
import type {
  Category,
  Dish,
  Mood,
  Order,
  OrderItem,
  OrderStatus,
  Review,
  StoreData,
  Table,
} from "@/types/database";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

let queue: Promise<unknown> = Promise.resolve();

function lock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readStore(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as StoreData;
  } catch {
    const seed = createSeed();
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(seed, null, 2));
    return seed;
  }
}

async function writeStore(data: StoreData) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2));
}

export function withStore<T>(fn: (data: StoreData) => Promise<T> | T) {
  return lock(async () => {
    const data = await readStore();
    const result = await fn(data);
    await writeStore(data);
    return result;
  });
}

export function readOnly<T>(fn: (data: StoreData) => Promise<T> | T) {
  return lock(async () => fn(await readStore()));
}

export function getMenu(restaurantId: string) {
  return readOnly((data) => {
    const restaurant = data.restaurants.find((r) => r.id === restaurantId);
    if (!restaurant) return null;
    const categories = data.categories
      .filter((c) => c.restaurant_id === restaurantId)
      .sort((a, b) => a.order_index - b.order_index);
    const dishes = data.dishes.filter((d) =>
      categories.some((c) => c.id === d.category_id),
    );
    const tables = data.tables.filter((t) => t.restaurant_id === restaurantId);
    return { restaurant, categories, dishes, tables };
  });
}

export function createOrder(input: {
  restaurant_id: string;
  table_id: string;
  items: OrderItem[];
  mood: Mood | null;
}) {
  return withStore((data) => {
    const total = input.items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );
    const order: Order = {
      id: crypto.randomUUID(),
      restaurant_id: input.restaurant_id,
      table_id: input.table_id,
      status: "pending",
      items: input.items,
      total_amount: total,
      mood: input.mood,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.orders.unshift(order);
    return order;
  });
}

export function listOrders(restaurantId: string, tableId?: string) {
  return readOnly((data) =>
    data.orders.filter(
      (o) =>
        o.restaurant_id === restaurantId &&
        (!tableId || o.table_id === tableId),
    ),
  );
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  return withStore((data) => {
    const order = data.orders.find((o) => o.id === id);
    if (!order) return null;
    order.status = status;
    order.updated_at = new Date().toISOString();
    return order;
  });
}

export function upsertCategory(category: Category) {
  return withStore((data) => {
    const idx = data.categories.findIndex((c) => c.id === category.id);
    if (idx >= 0) data.categories[idx] = category;
    else data.categories.push(category);
    return category;
  });
}

export function upsertDish(dish: Dish) {
  return withStore((data) => {
    const idx = data.dishes.findIndex((d) => d.id === dish.id);
    if (idx >= 0) data.dishes[idx] = dish;
    else data.dishes.push(dish);
    return dish;
  });
}

export function deleteDish(id: string) {
  return withStore((data) => {
    const before = data.dishes.length;
    data.dishes = data.dishes.filter((d) => d.id !== id);
    return before !== data.dishes.length;
  });
}

export function upsertTable(table: Table) {
  return withStore((data) => {
    const idx = data.tables.findIndex((t) => t.id === table.id);
    if (idx >= 0) data.tables[idx] = table;
    else data.tables.push(table);
    return table;
  });
}

export function addReview(input: Omit<Review, "id" | "created_at">) {
  return withStore((data) => {
    const review: Review = {
      ...input,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    data.reviews.unshift(review);
    return review;
  });
}

export function listReviews(restaurantId: string) {
  return readOnly((data) =>
    data.reviews.filter((r) => r.restaurant_id === restaurantId),
  );
}

export function resetStore() {
  return lock(async () => {
    const seed = createSeed();
    await writeStore(seed);
    return seed;
  });
}
