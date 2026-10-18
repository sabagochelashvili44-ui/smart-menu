"use client";

import {
  ADMIN_LANGS,
  adminUi,
  type AdminCopy,
  type AdminLocale,
} from "@/lib/admin-i18n";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "smart-ai-menu-admin-lang";

const AdminLocaleContext = createContext<{
  locale: AdminLocale;
  setLocale: (locale: AdminLocale) => void;
  t: AdminCopy;
} | null>(null);

function isAdminLocale(value: string | null): value is AdminLocale {
  return value === "ka" || value === "en" || value === "ru";
}

export function AdminLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>("ka");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isAdminLocale(stored)) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((next: AdminLocale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: adminUi[locale],
    }),
    [locale, setLocale],
  );

  return (
    <AdminLocaleContext.Provider value={value}>
      {children}
    </AdminLocaleContext.Provider>
  );
}

export function useAdminLocale() {
  const ctx = useContext(AdminLocaleContext);
  if (!ctx) {
    throw new Error("useAdminLocale must be used inside AdminLocaleProvider");
  }
  return ctx;
}

export function AdminLanguageSwitcher() {
  const { locale, setLocale, t } = useAdminLocale();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground hidden sm:inline">{t.language}</span>
      <select
        aria-label={t.language}
        className="border-input bg-background h-8 rounded-lg border px-2 text-sm font-medium"
        value={locale}
        onChange={(event) => setLocale(event.target.value as AdminLocale)}
      >
        {ADMIN_LANGS.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.flag} {lang.short}
          </option>
        ))}
      </select>
    </label>
  );
}
