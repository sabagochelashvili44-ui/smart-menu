"use client";

import {
  AdminLanguageSwitcher,
  AdminLocaleProvider,
  useAdminLocale,
} from "@/components/admin/admin-locale";
import type { AdminUiKey } from "@/lib/admin-i18n";
import type { ReactNode } from "react";

export function AuthPageShell({
  titleKey,
  hintKey,
  children,
}: {
  titleKey: AdminUiKey;
  hintKey?: AdminUiKey;
  children: ReactNode;
}) {
  return (
    <AdminLocaleProvider>
      <AuthPageShellInner titleKey={titleKey} hintKey={hintKey}>
        {children}
      </AuthPageShellInner>
    </AdminLocaleProvider>
  );
}

function AuthPageShellInner({
  titleKey,
  hintKey,
  children,
}: {
  titleKey: AdminUiKey;
  hintKey?: AdminUiKey;
  children: ReactNode;
}) {
  const { t } = useAdminLocale();
  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex justify-end">
        <AdminLanguageSwitcher />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t[titleKey]}</h1>
        {hintKey ? (
          <p className="text-muted-foreground mt-1 text-sm">{t[hintKey]}</p>
        ) : null}
      </div>
      {children}
    </main>
  );
}
