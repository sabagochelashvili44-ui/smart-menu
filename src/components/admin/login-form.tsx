"use client";

import {
  AdminLanguageSwitcher,
  AdminLocaleProvider,
  useAdminLocale,
} from "@/components/admin/admin-locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bindManagerTenant } from "@/app/admin/tenant-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { PasswordField } from "@/components/admin/password-field";
import { adminLandingPath, hardRedirectToAdmin } from "@/lib/login-redirect";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type Mode = "signin" | "signup";

export function LoginScreen() {
  return (
    <AdminLocaleProvider>
      <Suspense>
        <LoginScreenInner />
      </Suspense>
    </AdminLocaleProvider>
  );
}

function LoginScreenInner() {
  const { t } = useAdminLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantKey =
    searchParams.get("restaurant")?.trim() ||
    searchParams.get("slug")?.trim() ||
    "";
  const invitedEmail = searchParams.get("email")?.trim() ?? "";
  const nextPath = searchParams.get("next");
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [managerEmail, setManagerEmail] = useState("");
  const [alreadySignedIn, setAlreadySignedIn] = useState(false);

  useEffect(() => {
    if (!tenantKey) return;
    void createSupabaseClient()
      .from("restaurants")
      .select("name, manager_email")
      .eq("slug", tenantKey)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setRestaurantName(String(data.name));
        if (data?.manager_email) setManagerEmail(String(data.manager_email));
      });
  }, [tenantKey]);

  useEffect(() => {
    void createSupabaseBrowserClient()
      .auth.getUser()
      .then((result: { data: { user: { email?: string | null } | null } }) => {
        const user = result.data.user;
        if (!user) return;
        if (tenantKey) {
          setAlreadySignedIn(true);
          return;
        }
        hardRedirectToAdmin(adminLandingPath(user.email, nextPath));
      });
  }, [nextPath, tenantKey]);

  const heading = tenantKey
    ? `${t.loginForTenant}: ${restaurantName ?? tenantKey}`
    : t.loginTitle;

  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 p-6">
      {alreadySignedIn ? (
        <div
          role="status"
          className="rounded-lg border border-secondary/40 bg-muted px-3 py-2 text-sm"
        >
          <p>{t.alreadySignedInShare}</p>
          <ContinueAsAdminButton
            restaurantSlug={tenantKey}
            nextPath={nextPath}
            label={t.continueAsAdmin}
          />
        </div>
      ) : null}
      <div className="flex justify-end">
        <AdminLanguageSwitcher />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        {tenantKey ? null : (
          <p className="text-muted-foreground mt-1 text-sm">{t.loginHint}</p>
        )}
      </div>
      <LoginForm
        initialEmail={invitedEmail || managerEmail}
        initialMode={
          pathname === "/register" || invitedEmail ? "signup" : "signin"
        }
        restaurantSlug={tenantKey}
        nextPath={nextPath}
      />
    </main>
  );
}

function ContinueAsAdminButton({
  restaurantSlug,
  nextPath,
  label,
}: {
  restaurantSlug: string;
  nextPath: string | null;
  label: string;
}) {
  return (
    <button
      type="button"
      className="text-primary mt-1 inline-block text-sm font-medium underline"
      onClick={() => {
        void (async () => {
          const result = await createSupabaseBrowserClient().auth.getUser();
          const userEmail =
            (result as { data?: { user?: { email?: string | null } | null } })
              .data?.user?.email ?? null;
          const fallback = adminLandingPath(userEmail, nextPath);
          void bindManagerTenant(restaurantSlug || null);
          hardRedirectToAdmin(fallback);
        })();
      }}
    >
      {label}
    </button>
  );
}

export function LoginForm({
  initialEmail = "",
  initialMode = "signin",
  restaurantSlug = "",
  nextPath = null,
}: {
  initialEmail?: string;
  initialMode?: Mode;
  restaurantSlug?: string;
  nextPath?: string | null;
}) {
  const { t } = useAdminLocale();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  async function goToAdmin() {
    const fallback = adminLandingPath(email, nextPath);
    if (fallback === "/admin/super-admin") {
      void bindManagerTenant(restaurantSlug || null);
      hardRedirectToAdmin("/admin/super-admin");
      return;
    }

    try {
      const bound = await Promise.race([
        bindManagerTenant(restaurantSlug || null),
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 2500);
        }),
      ]);
      if (bound?.isSuperAdmin) {
        hardRedirectToAdmin("/admin/super-admin");
        return;
      }
      const url =
        bound?.redirectTo && bound.redirectTo !== "/login"
          ? bound.redirectTo
          : fallback;
      hardRedirectToAdmin(url);
    } catch {
      hardRedirectToAdmin(fallback);
    }
  }

  async function signIn(supabase: ReturnType<typeof createSupabaseBrowserClient>) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      return false;
    }
    return true;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError(t.passwordsMismatch);
      return;
    }

    setPending(true);
    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === "signin") {
        const ok = await signIn(supabase);
        if (ok) {
          setSuccess(t.signedIn);
          await goToAdmin();
        }
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        const alreadyExists = /already|registered|exists/i.test(
          signUpError.message,
        );
        setError(alreadyExists ? t.alreadyExists : signUpError.message);
        return;
      }

      if (data.user?.identities && data.user.identities.length === 0) {
        setError(t.alreadyExists);
        return;
      }

      if (data.session) {
        setSuccess(t.accountCreated);
        await goToAdmin();
        return;
      }

      const signedIn = await signIn(supabase);
      if (signedIn) {
        setSuccess(t.accountCreated);
        await goToAdmin();
        return;
      }

      setSuccess(t.confirmEmail);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={mode}
        onValueChange={(value) => {
          setMode(value as Mode);
          setError(null);
          setSuccess(null);
          setConfirmPassword("");
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">{t.signIn}</TabsTrigger>
          <TabsTrigger value="signup">{t.createAccount}</TabsTrigger>
        </TabsList>
      </Tabs>

      <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <div className="space-y-1">
          <Label htmlFor="email">{t.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <PasswordField
          id="password"
          label={t.password}
          placeholder={t.passwordPlaceholder}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={setPassword}
        />
        {mode === "signin" ? (
          <p className="text-right">
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            >
              {t.forgotPassword}
            </Link>
          </p>
        ) : null}
        {mode === "signup" ? (
          <PasswordField
            id="confirm-password"
            label={t.confirmPassword}
            placeholder={t.confirmPlaceholder}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            invalid={Boolean(confirmPassword) && confirmPassword !== password}
          />
        ) : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        {success ? (
          <p className="text-sm text-emerald-700">{success}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending
            ? mode === "signup"
              ? t.creatingAccount
              : t.signingIn
            : mode === "signup"
              ? t.createAccount
              : t.signIn}
        </Button>
      </form>
    </div>
  );
}
