import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Used only when env is unset at build time so `next build` can collect pages. */
const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const BUILD_PLACEHOLDER_ANON_KEY = "public-anon-key";

export function getSupabaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return raw.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

export function getSupabaseClientCredentials() {
  return {
    url: getSupabaseUrl() || BUILD_PLACEHOLDER_URL,
    key: getSupabaseAnonKey() || BUILD_PLACEHOLDER_ANON_KEY,
  };
}

export function createSupabaseClient(): SupabaseClient {
  const { url, key } = getSupabaseClientCredentials();
  return createClient(url, key);
}

export const supabase = createSupabaseClient();
