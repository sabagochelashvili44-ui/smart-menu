import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseClientCredentials } from "@/lib/supabaseClient";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/** Browser-only Supabase client. Safe for Client Components and never uses next/headers. */
export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const { url, key } = getSupabaseClientCredentials();
  browserClient = createBrowserClient(url, key);
  return browserClient;
}

export const createBrowserSupabaseClient = createSupabaseBrowserClient;
