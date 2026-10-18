"use client";

import { AuthPageShell } from "@/components/admin/auth-page-shell";
import { useAdminLocale } from "@/components/admin/admin-locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordResetRedirectUrl } from "@/lib/app-url";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordScreen() {
  return (
    <AuthPageShell titleKey="forgotPasswordTitle" hintKey="forgotPasswordHint">
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}

function ForgotPasswordForm() {
  const { t } = useAdminLocale();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: passwordResetRedirectUrl() },
      );
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
      <div className="space-y-1">
        <Label htmlFor="reset-email">{t.email}</Label>
        <Input
          id="reset-email"
          type="email"
          autoComplete="email"
          required
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {sent ? (
        <p role="status" className="text-sm text-emerald-700">
          {t.resetEmailSent}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending || sent}>
        {pending ? t.sendingResetLink : t.sendResetLink}
      </Button>
      <p className="text-center text-sm">
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          {t.backToLogin}
        </Link>
      </p>
    </form>
  );
}
