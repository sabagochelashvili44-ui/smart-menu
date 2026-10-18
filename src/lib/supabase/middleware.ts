import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { userLooksLikeSuperAdmin } from "@/lib/super-admin-shared";
import {
  IMPERSONATE_RESTAURANT_QUERY,
  RESTAURANT_ID_RE,
  VIEW_AS_COOKIE,
} from "@/lib/tenant-shared";

function supabaseUrl() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  while (url.endsWith("/")) url = url.slice(0, -1);
  const restSuffix = "/rest/v1";
  if (url.toLowerCase().endsWith(restSuffix)) {
    url = url.slice(0, -restSuffix.length);
  }
  return url;
}

function nextWithPathname(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

function impersonateRedirect(
  request: NextRequest,
  response: NextResponse,
  impersonateId: string,
) {
  const clean = request.nextUrl.clone();
  clean.searchParams.delete(IMPERSONATE_RESTAURANT_QUERY);
  if (clean.pathname === "/admin/super-admin") {
    clean.pathname = "/admin";
  }
  const redirected = NextResponse.redirect(clean);
  for (const cookie of response.cookies.getAll()) {
    redirected.cookies.set(cookie);
  }
  redirected.cookies.set(VIEW_AS_COOKIE, impersonateId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return redirected;
}

function signedInHome(request: NextRequest, isSuperAdmin: boolean) {
  const next = request.nextUrl.searchParams.get("next")?.trim() ?? "";
  const admin = request.nextUrl.clone();
  admin.search = "";
  const nextPath =
    next.startsWith("/admin") && !next.startsWith("//")
      ? next.split("?")[0] || "/admin"
      : "";
  const nextIsSuperAdmin =
    nextPath === "/admin/super-admin" ||
    nextPath.startsWith("/admin/super-admin/");
  if (nextPath && (!nextIsSuperAdmin || isSuperAdmin)) {
    admin.pathname = nextPath;
  } else if (isSuperAdmin) {
    admin.pathname = "/admin/super-admin";
  } else {
    admin.pathname = "/admin";
  }
  return NextResponse.redirect(admin);
}

export async function updateSession(request: NextRequest) {
  let response = nextWithPathname(request);
  const url = supabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = nextWithPathname(request);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdmin = path === "/admin" || path.startsWith("/admin/");
  const impersonateId =
    request.nextUrl.searchParams.get(IMPERSONATE_RESTAURANT_QUERY)?.trim() ?? "";

  if (
    isAdmin &&
    user &&
    userLooksLikeSuperAdmin(user) &&
    RESTAURANT_ID_RE.test(impersonateId)
  ) {
    return impersonateRedirect(request, response, impersonateId);
  }

  if (isAdmin && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if ((path === "/login" || path === "/register") && user) {
    const tenantKey =
      request.nextUrl.searchParams.get("restaurant") ??
      request.nextUrl.searchParams.get("slug");
    if (tenantKey) return response;
    return signedInHome(request, userLooksLikeSuperAdmin(user));
  }

  return response;
}
