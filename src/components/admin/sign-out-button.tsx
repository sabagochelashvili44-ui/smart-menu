"use client";

import { useAdminLocale } from "@/components/admin/admin-locale";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useState } from "react";

export function SignOutButton() {
  const { t } = useAdminLocale();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Still clear the browser and leave admin.
    }

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Storage may be blocked in private mode.
    }

    window.location.href = "/login";
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => void handleLogout()}
    >
      {t.logout}
    </Button>
  );
}
