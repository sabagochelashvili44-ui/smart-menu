"use client";

import type { createSupabaseBrowserClient } from "@/lib/supabase/client";

type BrowserSupabase = ReturnType<typeof createSupabaseBrowserClient>;

function hashParams() {
  const raw = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(raw);
}

function queryParams() {
  return new URLSearchParams(window.location.search);
}

function clearAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  for (const key of [
    "code",
    "token_hash",
    "type",
    "error",
    "error_code",
    "error_description",
  ]) {
    url.searchParams.delete(key);
  }
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

async function sessionFromHash(supabase: BrowserSupabase, hash: URLSearchParams) {
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  clearAuthParamsFromUrl();
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

async function sessionFromOtp(supabase: BrowserSupabase, query: URLSearchParams) {
  const tokenHash = query.get("token_hash");
  const otpType = query.get("type");
  if (!tokenHash || (otpType !== "recovery" && otpType !== "magiclink" && otpType !== "email")) {
    return null;
  }
  const { error } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: tokenHash,
  });
  clearAuthParamsFromUrl();
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

async function sessionFromCode(supabase: BrowserSupabase, code: string) {
  await new Promise((resolve) => window.setTimeout(resolve, 400));
  const existing = await supabase.auth.getSession();
  if (existing.data.session) {
    clearAuthParamsFromUrl();
    return { ok: true as const };
  }
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  clearAuthParamsFromUrl();
  if (error) {
    const retry = await supabase.auth.getSession();
    if (retry.data.session) return { ok: true as const };
    return { ok: false as const, message: error.message };
  }
  return { ok: true as const };
}

export async function establishRecoverySession(supabase: BrowserSupabase) {
  const hash = hashParams();
  const query = queryParams();
  const redirectError =
    query.get("error_description") || query.get("error") || hash.get("error_description");
  if (redirectError) {
    return { ok: false as const, message: redirectError };
  }

  const fromHash = await sessionFromHash(supabase, hash);
  if (fromHash) return fromHash;
  const fromOtp = await sessionFromOtp(supabase, query);
  if (fromOtp) return fromOtp;
  const code = query.get("code");
  if (code) return sessionFromCode(supabase, code);

  const { data } = await supabase.auth.getSession();
  if (data.session) return { ok: true as const };
  return { ok: false as const, message: null };
}
