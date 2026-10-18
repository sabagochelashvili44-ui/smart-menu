"use client";

import { AuthPageShell } from "@/components/admin/auth-page-shell";
import { useAdminLocale } from "@/components/admin/admin-locale";
import { PasswordField } from "@/components/admin/password-field";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { establishRecoverySession } from "@/lib/supabase/recovery-session";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

type SessionResult = { data: { session: Session | null } };

export function ResetPasswordScreen() {
  return (
    <AuthPageShell titleKey="resetPasswordTitle" hintKey="resetPasswordHint">
      <div className="rounded-xl border border-secondary/30 bg-card p-5 shadow-sm">
        <ResetPasswordForm />
      </div>
    </AuthPageShell>
  );
}

function ResetPasswordForm() {
  const { t } = useAdminLocale();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (
          event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "INITIAL_SESSION"
        ) {
          void supabase.auth.getSession().then((result: SessionResult) => {
            if (cancelled || !result.data.session) return;
            setReady(true);
            setChecking(false);
            setError(null);
          });
        }
      },
    );

    void establishRecoverySession(supabase).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setReady(true);
        setChecking(false);
        setError(null);
        return;
      }
      void supabase.auth.getSession().then((sessionResult: SessionResult) => {
        if (cancelled) return;
        if (sessionResult.data.session) {
          setReady(true);
          setChecking(false);
          setError(null);
          return;
        }
        setReady(false);
        setChecking(false);
        setError(result.message || t.resetLinkInvalid);
      });
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [t.resetLinkInvalid]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError(t.passwordsMismatch);
      return;
    }
    if (password.length < 6) {
      setError(t.passwordTooShort);
      return;
    }

    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(t.passwordResetSuccess);
      await supabase.auth.signOut({ scope: "local" });
      window.setTimeout(() => {
        window.location.assign("/login");
      }, 2000);
    } finally {
      setPending(false);
    }
  }

  if (checking && !ready) {
    return <p className="text-muted-foreground text-sm">{t.resetLinkChecking}</p>;
  }

  if (!ready) {
    return (
      <div className="space-y-4">
        <p className="text-destructive text-sm">{error ?? t.resetLinkInvalid}</p>
        <p className="text-center text-sm">
          <a
            href="/login"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            {t.backToLogin}
          </a>
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
      <PasswordField
        id="new-password"
        label={t.newPassword}
        placeholder={t.passwordPlaceholder}
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      <PasswordField
        id="confirm-new-password"
        label={t.confirmNewPassword}
        placeholder={t.confirmPlaceholder}
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        invalid={Boolean(confirmPassword) && confirmPassword !== password}
      />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {success ? (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending || Boolean(success)}>
        {pending ? t.savingSecret : t.setNewPassword}
      </Button>
      {success ? null : (
        <p className="text-center text-sm">
          <a
            href="/login"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {t.backToLogin}
          </a>
        </p>
      )}
    </form>
  );
}
