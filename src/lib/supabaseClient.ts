import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Used only when env is unset at build time so `next build` can collect pages. */
const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const BUILD_PLACEHOLDER_ANON_KEY = "public-anon-key";

export function getSupabaseUrl() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  while (url.endsWith("/")) url = url.slice(0, -1);
  const restSuffix = "/rest/v1";
  if (url.toLowerCase().endsWith(restSuffix)) {
    url = url.slice(0, -restSuffix.length);
  }
  return url;
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
