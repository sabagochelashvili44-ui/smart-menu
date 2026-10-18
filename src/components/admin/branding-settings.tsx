"use client";

import { saveRestaurantBranding } from "@/app/admin/actions";
import { useAdminLocale } from "@/components/admin/admin-locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guestTableMenuUrl } from "@/lib/app-url";
import {
  BRAND_FONTS,
  DEFAULT_BRAND,
  brandCssVars,
  normalizeHex,
  restaurantLogo,
  restaurantPublicKey,
  slugifyRestaurant,
} from "@/lib/restaurant-brand";
import type { AdminRestaurant } from "@/lib/supabaseAdmin";
import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties, type FormEvent } from "react";

export function BrandingSettings({ restaurant }: { restaurant: AdminRestaurant }) {
  const { t } = useAdminLocale();
  const router = useRouter();
  const [name, setName] = useState(restaurant.name);
  const [slug, setSlug] = useState(
    restaurant.slug ?? slugifyRestaurant(restaurant.name),
  );
  const [logoUrl, setLogoUrl] = useState(restaurantLogo(restaurant) ?? "");
  const [primary, setPrimary] = useState(
    normalizeHex(restaurant.primary_color, DEFAULT_BRAND.primary_color),
  );
  const [secondary, setSecondary] = useState(
    normalizeHex(restaurant.secondary_color, DEFAULT_BRAND.secondary_color),
  );
  const [bg, setBg] = useState(
    normalizeHex(restaurant.bg_color, DEFAULT_BRAND.bg_color),
  );
  const [font, setFont] = useState(restaurant.font ?? DEFAULT_BRAND.font);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    restaurant.google_maps_review_url ?? restaurant.google_review_url ?? "",
  );
  const [serviceFeePercent, setServiceFeePercent] = useState(
    String(restaurant.service_fee_percent ?? 0),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const previewVars = useMemo(
    () =>
      brandCssVars({
        id: restaurant.id,
        name,
        primary_color: primary,
        secondary_color: secondary,
        bg_color: bg,
        font,
      }) as CSSProperties,
    [restaurant.id, name, primary, secondary, bg, font],
  );

  const sampleUrl = guestTableMenuUrl(
    slugifyRestaurant(slug) || restaurant.id,
    "Table 1",
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    form.set("name", name);
    form.set("slug", slug);
    form.set("logo_url", logoUrl);
    form.set("primary_color", primary);
    form.set("secondary_color", secondary);
    form.set("bg_color", bg);
    form.set("font", font);
    form.set("google_review_url", googleReviewUrl);
    form.set("google_maps_review_url", googleReviewUrl);
    form.set("service_fee_percent", serviceFeePercent);
    const result = await saveRestaurantBranding(form);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="restaurant-name">{t.restaurantName}</Label>
          <Input
            id="restaurant-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="restaurant-slug">{t.slug}</Label>
          <Input
            id="restaurant-slug"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
          />
          <p className="text-muted-foreground text-xs">{t.slugHint}</p>
          <p className="text-muted-foreground break-all text-xs">{sampleUrl}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="logo-file">{t.logo}</Label>
          <Input id="logo-file" name="logo" type="file" accept="image/*" />
          <Label htmlFor="logo-url">{t.logoUrl}</Label>
          <Input
            id="logo-url"
            name="logo_url"
            value={logoUrl}
            onChange={(event) => setLogoUrl(event.target.value)}
            placeholder="https://"
          />
          <p className="text-muted-foreground text-xs">{t.logoHint}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="service-fee-percent">{t.serviceFeePercent}</Label>
          <Input
            id="service-fee-percent"
            name="service_fee_percent"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={serviceFeePercent}
            onChange={(event) => setServiceFeePercent(event.target.value)}
            placeholder="10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="google-review-url">{t.googleReviewUrl}</Label>
          <Input
            id="google-review-url"
            name="google_maps_review_url"
            type="url"
            value={googleReviewUrl}
            onChange={(event) => setGoogleReviewUrl(event.target.value)}
            placeholder={t.googleReviewPlaceholder}
          />
          <p className="text-muted-foreground text-xs">{t.googleReviewHint}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ColorField
            id="primary_color"
            label={t.primaryColor}
            value={primary}
            onChange={setPrimary}
          />
          <ColorField
            id="secondary_color"
            label={t.secondaryColor}
            value={secondary}
            onChange={setSecondary}
          />
          <ColorField
            id="bg_color"
            label={t.bgColor}
            value={bg}
            onChange={setBg}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="font">{t.font}</Label>
          <select
            id="font"
            name="font"
            value={font}
            onChange={(event) => setFont(event.target.value)}
            className="border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm"
          >
            {BRAND_FONTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        {saved ? <p className="text-sm text-secondary">{t.saved}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "…" : t.saveSettings}
        </Button>
      </div>
      <aside
        className="rounded-xl border border-secondary/30 p-4"
        style={previewVars}
      >
        <p className="text-muted-foreground mb-3 text-xs uppercase tracking-wide">
          {t.preview}
        </p>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="size-12 rounded-full object-cover ring-1 ring-foreground/10"
            />
          ) : (
            <div className="bg-muted flex size-12 items-center justify-center rounded-full text-lg font-semibold">
              {name.slice(0, 1) || "R"}
            </div>
          )}
          <div>
            <p className="font-semibold">{name || restaurantPublicKey(restaurant)}</p>
            <p className="text-muted-foreground text-xs">/{slug || "slug"}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <span className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs">
            Primary
          </span>
          <span className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs">
            Secondary
          </span>
        </div>
      </aside>
    </form>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="border-input h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
        />
        <Input
          name={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
