"use client";

import {
  deleteAdminCategory,
  deleteAdminDish,
  saveAdminCategory,
  saveAdminDish,
  toggleAdminDish,
  uploadMenuDishImage,
} from "@/app/admin/actions";
import { useAdminLocale } from "@/components/admin/admin-locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { categoryLabel, dishDescription, dishLabel, formatGel } from "@/lib/menu-copy";
import { cn } from "@/lib/utils";
import type { AdminCategory, AdminDish } from "@/lib/supabaseAdmin";
import { ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type DishDraft = {
  id?: string;
  category_id: string;
  name: string;
  description: string;
  price: string;
  image_url: string;
  ingredients: string;
  allergens: string;
  is_available: boolean;
};

function emptyDraft(categoryId: string): DishDraft {
  return {
    category_id: categoryId,
    name: "",
    description: "",
    price: "",
    image_url: "",
    ingredients: "",
    allergens: "",
    is_available: true,
  };
}

function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAllergens(value: string) {
  return parseCommaList(value).map((item) => item.toLowerCase());
}

export function MenuManager({
  restaurantName,
  categories,
  dishes,
}: {
  restaurantName: string;
  categories: AdminCategory[];
  dishes: AdminDish[];
}) {
  const { locale, t } = useAdminLocale();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<AdminDish[]>(dishes);
  const [categoryRows, setCategoryRows] = useState<AdminCategory[]>(categories);
  const [categoryName, setCategoryName] = useState("");
  const [draft, setDraft] = useState<DishDraft>(
    emptyDraft(categories[0]?.id ?? ""),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setItems(dishes);
  }, [dishes]);

  useEffect(() => {
    setCategoryRows(categories);
  }, [categories]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const grouped = useMemo(
    () =>
      categoryRows.map((category) => ({
        category,
        dishes: items.filter((dish) => dish.category_id === category.id),
      })),
    [categoryRows, items],
  );
  const filledGroups = grouped.filter((group) => group.dishes.length > 0);
  const emptyCategories = grouped
    .filter((group) => group.dishes.length === 0)
    .map((group) => group.category);

  function upsertLocal(dish: AdminDish) {
    setItems((current) => {
      if (current.some((row) => row.id === dish.id)) {
        return current.map((row) => (row.id === dish.id ? dish : row));
      }
      return [...current, dish];
    });
  }

  function startEdit(dish: AdminDish) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDraft({
      id: dish.id,
      category_id: dish.category_id,
      name: dish.name,
      description: dish.description ?? "",
      price: String(dish.price ?? ""),
      image_url: dish.image_url ?? "",
      ingredients: (dish.ingredients ?? []).join(", "),
      allergens: (dish.allergens ?? []).join(", "),
      is_available: dish.is_available,
    });
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearDishImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDraft((current) => ({ ...current, image_url: "" }));
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function onImageSelected(file: File | null) {
    if (!file || uploadingImage) return;
    if (file.type && !file.type.startsWith("image/")) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploadingImage(true);
    setError(null);
    const payload = new FormData();
    payload.set("image", file);
    try {
      const result = await uploadMenuDishImage(payload);
      if (result.error || !result.url) {
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
        setError(result.error ?? t.imageUploadFailed);
        return;
      }
      setDraft((current) => ({ ...current, image_url: result.url! }));
    } catch {
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
      setError(t.imageUploadFailed);
    } finally {
      setUploadingImage(false);
    }
  }

  async function save() {
    if (!draft.name.trim() || !draft.category_id || uploadingImage) return;
    setSaving(true);
    const result = await saveAdminDish({
      id: draft.id,
      category_id: draft.category_id,
      name: draft.name,
      description: draft.description.trim(),
      price: Number(draft.price) || 0,
      image_url: draft.image_url,
      ingredients: parseCommaList(draft.ingredients),
      allergens: parseAllergens(draft.allergens),
      is_available: draft.is_available,
    });
    setSaving(false);
    if (result.error || !result.dish) {
      setError(result.error ?? t.saveChanges);
      return;
    }
    upsertLocal(result.dish);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDraft(emptyDraft(draft.category_id));
    router.refresh();
  }

  async function toggle(dish: AdminDish, available: boolean) {
    const previous = dish.is_available;
    setItems((current) =>
      current.map((row) =>
        row.id === dish.id ? { ...row, is_available: available } : row,
      ),
    );
    if (draft.id === dish.id) {
      setDraft((current) => ({ ...current, is_available: available }));
    }
    const result = await toggleAdminDish(dish.id, available);
    if (result.error) {
      setItems((current) =>
        current.map((row) =>
          row.id === dish.id ? { ...row, is_available: previous } : row,
        ),
      );
      setError(result.error);
      return;
    }
    if (result.dish) upsertLocal(result.dish);
    setError(null);
  }

  async function remove(id: string) {
    if (!window.confirm(t.deleteConfirm)) return;
    const snapshot = items;
    setItems((current) => current.filter((row) => row.id !== id));
    if (draft.id === id) {
      setDraft(emptyDraft(categoryRows[0]?.id ?? ""));
    }
    const result = await deleteAdminDish(id);
    if (result.error) {
      setItems(snapshot);
      setError(result.error);
      return;
    }
    setError(null);
    router.refresh();
  }

  async function addCategory() {
    if (!categoryName.trim()) return;
    setSaving(true);
    const result = await saveAdminCategory({ name: categoryName });
    setSaving(false);
    if (result.error || !result.category) {
      setError(result.error ?? t.saveChanges);
      return;
    }
    setCategoryRows((current) => [...current, result.category!]);
    setCategoryName("");
    setDraft((current) =>
      current.category_id ? current : emptyDraft(result.category!.id),
    );
    setError(null);
    router.refresh();
  }

  async function renameCategory(category: AdminCategory, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === category.name) return;
    const result = await saveAdminCategory({ id: category.id, name: trimmed });
    if (result.error || !result.category) {
      setError(result.error ?? t.saveChanges);
      return;
    }
    setCategoryRows((current) =>
      current.map((row) => (row.id === category.id ? result.category! : row)),
    );
    setError(null);
  }

  async function removeCategory(id: string) {
    if (!window.confirm(t.deleteConfirm)) return;
    const snapshotCategories = categoryRows;
    const snapshotItems = items;
    setCategoryRows((current) => current.filter((row) => row.id !== id));
    setItems((current) => current.filter((row) => row.category_id !== id));
    if (draft.category_id === id) {
      setDraft(
        emptyDraft(categoryRows.find((row) => row.id !== id)?.id ?? ""),
      );
    }
    const result = await deleteAdminCategory(id);
    if (result.error) {
      setCategoryRows(snapshotCategories);
      setItems(snapshotItems);
      setError(result.error);
      return;
    }
    setError(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm">
        {t.restaurant}: <span className="font-medium">{restaurantName}</span>
      </p>

      <form
        className="flex flex-wrap items-end gap-2 rounded-xl border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void addCategory();
        }}
      >
        <div className="min-w-48 flex-1 space-y-1">
          <Label htmlFor="new-category">{t.category}</Label>
          <Input
            id="new-category"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder={t.category}
          />
        </div>
        <Button type="submit" disabled={saving}>
          + {t.category}
        </Button>
      </form>

      <form
        ref={formRef}
        id="admin-dish-form"
        className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <h3 className="text-base font-medium sm:col-span-2">
          {draft.id ? t.editDish : t.addDish}
        </h3>
        <div className="space-y-1">
          <Label htmlFor="dish-name">{t.name}</Label>
          <Input
            id="dish-name"
            name="name"
            required
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="აჭარული ხაჭაპური"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dish-price">{t.price}</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
              ₾
            </span>
            <Input
              id="dish-price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              inputMode="decimal"
              className="pl-7"
              value={draft.price}
              onChange={(event) =>
                setDraft((current) => ({ ...current, price: event.target.value }))
              }
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="dish-desc">
            {t.description}{" "}
            <span className="text-muted-foreground font-normal">
              ({t.optional})
            </span>
          </Label>
          <Textarea
            id="dish-desc"
            name="description"
            value={draft.description}
            required={false}
            rows={3}
            placeholder={t.noDescription}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dish-image">{t.imageUrl}</Label>
          <input
            ref={imageInputRef}
            id="dish-image"
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingImage || saving}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              event.target.value = "";
              void onImageSelected(file);
            }}
          />
          <label
            htmlFor={uploadingImage ? undefined : "dish-image"}
            onDragOver={(event) => {
              event.preventDefault();
              if (!uploadingImage) setDragOver(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragOver(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              if (uploadingImage) return;
              const file = event.dataTransfer.files?.[0] ?? null;
              void onImageSelected(file);
            }}
            className={cn(
              "border-primary/30 bg-muted/40 relative flex min-h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
              dragOver && "border-primary bg-primary/10",
              uploadingImage && "pointer-events-none cursor-wait",
            )}
          >
            {previewUrl || draft.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl || draft.image_url}
                alt=""
                className="h-28 w-28 rounded-lg object-cover ring-1 ring-foreground/10"
              />
            ) : (
              <>
                <ImagePlus className="text-muted-foreground mb-2 size-8" />
                <span className="text-sm font-medium">{t.imageDropzone}</span>
                <span className="text-muted-foreground mt-1 text-xs">
                  {t.imageHint}
                </span>
              </>
            )}
            {uploadingImage ? (
              <span className="bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Loader2 className="text-primary size-6 animate-spin" />
                <span className="text-sm font-medium">{t.imageUploadingShort}</span>
              </span>
            ) : null}
          </label>
          {previewUrl || draft.image_url ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploadingImage}
                onClick={() => imageInputRef.current?.click()}
              >
                {t.imageChange}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={uploadingImage}
                onClick={clearDishImage}
              >
                {t.delete}
              </Button>
            </div>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="dish-cat">{t.category}</Label>
          <select
            id="dish-cat"
            className="border-input h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
            value={draft.category_id}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                category_id: event.target.value,
              }))
            }
          >
            {categoryRows.map((category) => (
              <option key={category.id} value={category.id}>
                {categoryLabel(category.name, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="dish-ingredients">{t.ingredients}</Label>
          <Input
            id="dish-ingredients"
            value={draft.ingredients}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                ingredients: event.target.value,
              }))
            }
            placeholder={t.ingredientsPlaceholder}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="dish-all">{t.allergens}</Label>
          <Input
            id="dish-all"
            value={draft.allergens}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                allergens: event.target.value,
              }))
            }
            placeholder="gluten, dairy, eggs"
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Label htmlFor="dish-available" className="flex items-center gap-2">
            <Switch
              id="dish-available"
              checked={draft.is_available}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, is_available: checked }))
              }
            />
            {draft.is_available ? t.inStock : t.soldOut}
          </Label>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={saving || uploadingImage}>
            {uploadingImage
              ? t.imageUploading
              : draft.id
                ? t.saveChanges
                : t.addDish}
          </Button>
          {draft.id ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                setDraft(emptyDraft(categoryRows[0]?.id ?? ""));
              }}
            >
              {t.cancelEdit}
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-destructive text-sm sm:col-span-2">{error}</p> : null}
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground py-6 text-sm">{t.menuEmpty}</p>
      ) : null}

      {filledGroups.map(({ category, dishes: categoryDishes }) => (
        <section key={category.id} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              defaultValue={category.name}
              className="h-8 max-w-xs"
              onBlur={(event) =>
                void renameCategory(category, event.target.value)
              }
              aria-label={t.category}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void removeCategory(category.id)}
            >
              {t.delete}
            </Button>
          </div>
          {categoryDishes.map((dish) => (
            <div
              key={dish.id}
              className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {dishLabel(dish.name, locale)} ·{" "}
                  <span className="text-primary">
                    {formatGel(Number(dish.price))}
                  </span>
                </p>
                <p className="text-muted-foreground line-clamp-2 text-xs">
                  {dish.description
                    ? dishDescription(dish.name, dish.description, locale)
                    : t.noDescription}
                </p>
                {(dish.ingredients ?? []).length > 0 ? (
                  <p className="text-muted-foreground line-clamp-2 text-xs">
                    {t.ingredients}: {(dish.ingredients ?? []).join(", ")}
                  </p>
                ) : null}
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant={dish.is_available ? "secondary" : "destructive"}>
                    {dish.is_available ? t.inStock : t.soldOut}
                  </Badge>
                  {(dish.allergens ?? []).map((allergen) => (
                    <Badge key={allergen} variant="outline">
                      {allergen}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-xs" htmlFor={`stock-${dish.id}`}>
                  {dish.is_available ? t.inStock : t.soldOut}
                </Label>
                <Switch
                  id={`stock-${dish.id}`}
                  nativeButton
                  checked={dish.is_available}
                  onCheckedChange={(checked) => void toggle(dish, checked)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(dish)}
                >
                  {t.edit}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void remove(dish.id)}
                >
                  {t.delete}
                </Button>
              </div>
            </div>
          ))}
        </section>
      ))}

      {emptyCategories.length > 0 ? (
        <section className="space-y-2">
          {emptyCategories.map((category) => (
            <div key={category.id} className="flex flex-wrap items-center gap-2">
              <Input
                defaultValue={category.name}
                className="h-8 max-w-xs"
                onBlur={(event) =>
                  void renameCategory(category, event.target.value)
                }
                aria-label={t.category}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void removeCategory(category.id)}
              >
                {t.delete}
              </Button>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
