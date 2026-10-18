export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

export const DEFAULT_BRAND = {
  primary_color: "#6d0808",
  secondary_color: "#757d6f",
  bg_color: "#eeead7",
  font: "noto-sans-georgian",
} as const;

export const BRAND_FONTS = [
  {
    id: "noto-sans-georgian",
    label: "Noto Sans Georgian",
    css: "var(--font-noto-sans-georgian), var(--font-noto-sans), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "noto-sans",
    label: "Noto Sans",
    css: "var(--font-noto-sans), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "georgia",
    label: "Georgia",
    css: 'Georgia, "Times New Roman", Times, serif',
  },
  {
    id: "system",
    label: "System UI",
    css: "ui-sans-serif, system-ui, sans-serif",
  },
] as const;

export type BrandFontId = (typeof BRAND_FONTS)[number]["id"];

export type RestaurantBrandFields = {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  bg_color?: string | null;
  font?: string | null;
  subscription_status?: string | null;
  manager_email?: string | null;
  google_review_url?: string | null;
  google_maps_review_url?: string | null;
  service_fee_percent?: number | null;
};

export const RESTAURANT_BRAND_SELECT =
  "id, name, slug, logo, logo_url, primary_color, secondary_color, bg_color, font, subscription_status, manager_email, google_review_url, google_maps_review_url, service_fee_percent";

export function restaurantLogo(row: {
  logo?: string | null;
  logo_url?: string | null;
}) {
  return row.logo_url || row.logo || null;
}

export function restaurantPublicKey(row: {
  id: string;
  slug?: string | null;
}) {
  const slug = row.slug?.trim();
  return slug || row.id;
}

export function isSubscriptionSuspended(status: string | null | undefined) {
  return (status ?? "").toLowerCase() === "suspended";
}

export function slugifyRestaurant(input: string) {
  const ascii = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii.slice(0, 64);
}

export function normalizeHex(value: string | null | undefined, fallback: string) {
  const raw = (value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  return fallback;
}

function hexLuminance(hex: string) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastOn(hex: string) {
  return hexLuminance(hex) > 0.45 ? "#2d0000" : "#eeead7";
}

export function fontCss(fontId: string | null | undefined) {
  const match = BRAND_FONTS.find((item) => item.id === fontId);
  return (match ?? BRAND_FONTS[0]).css;
}

export function resolvedBrand(row: Partial<RestaurantBrandFields> | null) {
  const primary = normalizeHex(row?.primary_color, DEFAULT_BRAND.primary_color);
  const secondary = normalizeHex(
    row?.secondary_color,
    DEFAULT_BRAND.secondary_color,
  );
  const background = normalizeHex(row?.bg_color, DEFAULT_BRAND.bg_color);
  return {
    primary,
    secondary,
    background,
    font: fontCss(row?.font ?? DEFAULT_BRAND.font),
    foreground: contrastOn(background),
    onPrimary: contrastOn(primary),
    onSecondary: contrastOn(secondary),
  };
}

export function brandCssVars(row: Partial<RestaurantBrandFields> | null) {
  const brand = resolvedBrand(row);
  return {
    "--primary": brand.primary,
    "--primary-foreground": brand.onPrimary,
    "--secondary": brand.secondary,
    "--secondary-foreground": brand.onSecondary,
    "--background": brand.background,
    "--foreground": brand.foreground,
    "--card": brand.background,
    "--card-foreground": brand.foreground,
    "--popover": brand.background,
    "--popover-foreground": brand.foreground,
    "--muted": `color-mix(in srgb, ${brand.secondary} 18%, ${brand.background})`,
    "--muted-foreground": brand.secondary,
    "--accent": `color-mix(in srgb, ${brand.secondary} 18%, ${brand.background})`,
    "--accent-foreground": brand.foreground,
    "--destructive": brand.primary,
    "--ring": brand.primary,
    "--chart-1": brand.primary,
    "--chart-2": brand.secondary,
    "--sidebar": brand.background,
    "--sidebar-foreground": brand.foreground,
    "--sidebar-primary": brand.primary,
    "--sidebar-primary-foreground": brand.onPrimary,
    "--sidebar-accent": `color-mix(in srgb, ${brand.secondary} 18%, ${brand.background})`,
    "--sidebar-ring": brand.primary,
    "--font-sans": brand.font,
    "--font-heading": brand.font,
  } as const;
}

export function brandCssText(row: Partial<RestaurantBrandFields> | null) {
  return Object.entries(brandCssVars(row))
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}
