import { deleteDish, getMenu, upsertCategory, upsertDish } from "@/lib/data/store";
import { requireTenantApi } from "@/lib/tenant";
import type { Category, Dish, Lang } from "@/types/database";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const emptyTranslations = {
  ka: { name: "", description: "" },
  en: { name: "", description: "" },
  ar: { name: "", description: "" },
  ru: { name: "", description: "" },
  fr: { name: "", description: "" },
} satisfies Dish["translations"];

export async function GET() {
  const tenant = await requireTenantApi();
  if (!tenant.ok) return tenant.response;
  const menu = await getMenu(tenant.restaurant.id);
  if (!menu) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }
  return NextResponse.json(menu);
}

export async function POST(request: Request) {
  const tenant = await requireTenantApi(["owner", "manager"]);
  if (!tenant.ok) return tenant.response;
  const body = (await request.json()) as {
    type?: "dish" | "category";
    dish?: Partial<Dish>;
    category?: Partial<Category>;
  };

  if (body.type === "category" && body.category?.name) {
    const category: Category = {
      id: body.category.id || crypto.randomUUID(),
      restaurant_id: tenant.restaurant.id,
      name: body.category.name,
      order_index: body.category.order_index ?? 99,
      translations: body.category.translations ?? {
        en: body.category.name,
        ar: body.category.name,
        ru: body.category.name,
        fr: body.category.name,
      },
    };
    return NextResponse.json({ category: await upsertCategory(category) });
  }

  if (body.type === "dish" && body.dish?.name && body.dish.category_id) {
    const menu = await getMenu(tenant.restaurant.id);
    if (!menu?.categories.some((category) => category.id === body.dish?.category_id)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 403 });
    }
    const name = body.dish.name;
    const description = body.dish.description ?? "";
    const translations =
      body.dish.translations ??
      (Object.fromEntries(
        (["en", "ar", "ru", "fr"] as Lang[]).map((lang) => [
          lang,
          { name, description },
        ]),
      ) as Dish["translations"]);

    const dish: Dish = {
      id: body.dish.id || crypto.randomUUID(),
      category_id: body.dish.category_id,
      name,
      description,
      price: Number(body.dish.price ?? 0),
      margin_score: Number(body.dish.margin_score ?? 5),
      image_url: body.dish.image_url ?? null,
      allergens: body.dish.allergens ?? [],
      ingredients: body.dish.ingredients ?? [],
      is_available: body.dish.is_available ?? true,
      wine_pairing: body.dish.wine_pairing ?? "",
      translations: { ...emptyTranslations, ...translations },
    };
    return NextResponse.json({ dish: await upsertDish(dish) });
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}

export async function PATCH(request: Request) {
  const tenant = await requireTenantApi(["owner", "manager"]);
  if (!tenant.ok) return tenant.response;
  const body = (await request.json()) as { dish?: Dish; category?: Category };
  if (body.category) {
    body.category = { ...body.category, restaurant_id: tenant.restaurant.id };
  }
  if (body.dish) {
    const menu = await getMenu(tenant.restaurant.id);
    const categoryOk = menu?.categories.some(
      (category) => category.id === body.dish?.category_id,
    );
    const dishOk = menu?.dishes.some((dish) => dish.id === body.dish?.id);
    if (!categoryOk || !dishOk) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return NextResponse.json({ dish: await upsertDish(body.dish) });
  }
  if (body.category) {
    return NextResponse.json({ category: await upsertCategory(body.category) });
  }
  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const tenant = await requireTenantApi(["owner", "manager"]);
  if (!tenant.ok) return tenant.response;
  const id = new URL(request.url).searchParams.get("dishId");
  if (!id) {
    return NextResponse.json({ error: "dishId required" }, { status: 400 });
  }
  const menu = await getMenu(tenant.restaurant.id);
  if (!menu?.dishes.some((dish) => dish.id === id)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const ok = await deleteDish(id);
  return NextResponse.json({ ok });
}
