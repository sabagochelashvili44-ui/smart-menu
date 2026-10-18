"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/lib/i18n";
import type { Category, Dish, Lang } from "@/types/database";

export function MenuDisplay({
  lang,
  categories,
  dishes,
  cart,
  onAdd,
}: {
  lang: Lang;
  categories: Category[];
  dishes: Dish[];
  cart: Record<string, number>;
  onAdd: (dishId: string) => void;
}) {
  const first = categories[0]?.id ?? "starters";

  return (
    <Tabs defaultValue={first}>
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        {categories.map((category) => (
          <TabsTrigger key={category.id} value={category.id}>
            {category.translations[lang] ?? category.translations.en}
          </TabsTrigger>
        ))}
      </TabsList>
      {categories.map((category) => (
        <TabsContent key={category.id} value={category.id} className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {dishes
              .filter((dish) => dish.category_id === category.id)
              .map((dish) => {
                const copy = dish.translations[lang] ?? dish.translations.en;
                return (
                  <Card key={dish.id} className="overflow-hidden pt-0">
                    {dish.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={dish.image_url}
                        alt={copy.name}
                        className="h-40 w-full object-cover"
                      />
                    ) : null}
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between gap-2">
                        <span>{copy.name}</span>
                        <span>${dish.price.toFixed(2)}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-muted-foreground text-sm">
                        {copy.description}
                      </p>
                      {dish.margin_score >= 9 ? (
                        <Badge>{t(lang, "upsellHint")}</Badge>
                      ) : null}
                      <div className="flex flex-wrap gap-1">
                        {dish.allergens.map((allergen) => (
                          <Badge key={allergen} variant="secondary">
                            {allergen}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {t(lang, "pairing")}: {dish.wine_pairing}
                      </p>
                      <Button
                        disabled={!dish.is_available}
                        onClick={() => onAdd(dish.id)}
                      >
                        {dish.is_available
                          ? `${t(lang, "add")}${cart[dish.id] ? ` (${cart[dish.id]})` : ""}`
                          : t(lang, "unavailable")}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
