"use client";

import { useAdminLocale } from "@/components/admin/admin-locale";
import type { AdminUiKey } from "@/lib/admin-i18n";

export function AdminPageIntro({
  titleKey,
  subtitleKey,
}: {
  titleKey: AdminUiKey;
  subtitleKey: AdminUiKey;
}) {
  const { t } = useAdminLocale();
  return (
    <div>
      <h2 className="text-lg font-medium">{t[titleKey]}</h2>
      <p className="text-muted-foreground text-sm">{t[subtitleKey]}</p>
    </div>
  );
}

export function AdminEmptyRestaurant() {
  const { t } = useAdminLocale();
  return <p className="text-muted-foreground text-sm">{t.noRestaurant}</p>;
}
