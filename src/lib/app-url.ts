const PRODUCTION_APP_URL = "https://smart-menu-ai-phi.vercel.app";

function isPreviewOrLocalHost(hostname: string) {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  return (
    hostname.endsWith(".vercel.app") && hostname !== "smart-menu-ai-phi.vercel.app"
  );
}

export function getPublicAppUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    try {
      const parsed = new URL(fromEnv);
      if (!isPreviewOrLocalHost(parsed.hostname)) {
        return parsed.origin;
      }
    } catch {
      // Fall through to the production host.
    }
  }

  return PRODUCTION_APP_URL;
}

export function guestMenuUrl(restaurantKey: string, tableKey: string) {
  return `${getPublicAppUrl()}/menu/${restaurantKey}/${tableKey}`;
}

export function guestTableMenuUrl(slug: string, tableNumber: string) {
  const table = tableNumber.trim();
  return `${getPublicAppUrl()}/menu/${slug}/table/${encodeURIComponent(table)}`;
}

export function publicMenuUrl(slug: string) {
  return `${getPublicAppUrl()}/menu/${slug}`;
}

export function adminLoginUrl(slug?: string | null) {
  const base = `${getPublicAppUrl()}/login`;
  const key = slug?.trim();
  return key ? `${base}?restaurant=${encodeURIComponent(key)}` : base;
}

export function passwordResetRedirectUrl() {
  return `${getPublicAppUrl()}/reset-password`;
}
