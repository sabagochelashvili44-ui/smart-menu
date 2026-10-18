import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function tenantMenuRewrite(request: NextRequest) {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase();
  if (!root) return null;

  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (host === root || host === `www.${root}`) return null;

  const suffix = `.${root}`;
  if (!host.endsWith(suffix)) return null;

  const slug = host.slice(0, -suffix.length);
  if (!slug || slug === "www" || slug.includes(".")) return null;

  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/admin") ||
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/api") ||
    path.startsWith("/menu")
  ) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = path === "/" ? `/menu/${slug}` : `/menu/${slug}${path}`;
  return url;
}

export async function middleware(request: NextRequest) {
  const rewriteUrl = tenantMenuRewrite(request);
  if (rewriteUrl) {
    return NextResponse.rewrite(rewriteUrl);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/login",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
