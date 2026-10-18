"use client";

import { useAdminLocale } from "@/components/admin/admin-locale";
import type { StaffRole } from "@/lib/staff-role-shared";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const links = [
  {
    href: "/admin",
    key: "overview" as const,
    superOnly: false,
    roles: ["owner", "manager"] as StaffRole[],
  },
  {
    href: "/admin/menu",
    key: "menuNav" as const,
    superOnly: false,
    roles: ["owner", "manager"] as StaffRole[],
  },
  {
    href: "/admin/tables",
    key: "tablesQr" as const,
    superOnly: false,
    roles: ["owner", "manager", "waiter"] as StaffRole[],
  },
  {
    href: "/admin/kitchen",
    key: "kitchen" as const,
    superOnly: false,
    roles: ["owner", "manager", "waiter"] as StaffRole[],
  },
  {
    href: "/admin/analytics",
    key: "analytics" as const,
    superOnly: false,
    roles: ["owner"] as StaffRole[],
  },
  {
    href: "/admin/settings",
    key: "settings" as const,
    superOnly: false,
    roles: ["owner"] as StaffRole[],
  },
  {
    href: "/admin/staff",
    key: "staffNav" as const,
    superOnly: false,
    roles: ["owner"] as StaffRole[],
  },
  {
    href: "/admin/super-admin",
    key: "superAdmin" as const,
    superOnly: true,
    roles: [] as StaffRole[],
  },
];

export function AdminNav({
  showSuperAdmin = false,
  showRestaurantTabs = true,
  staffRole = null,
}: {
  showSuperAdmin?: boolean;
  showRestaurantTabs?: boolean;
  staffRole?: StaffRole | null;
}) {
  const pathname = usePathname();
  const { t } = useAdminLocale();

  const items = useMemo(
    () =>
      links.filter((link) => {
        if (link.superOnly) return showSuperAdmin;
        if (!showRestaurantTabs) return false;
        if (!staffRole) return false;
        return link.roles.includes(staffRole);
      }),
    [showRestaurantTabs, showSuperAdmin, staffRole],
  );

  return (
    <nav className="flex flex-wrap gap-2 border-b border-secondary/30 pb-4">
      {items.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin" || pathname === "/admin/overview"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t[link.key]}
          </Link>
        );
      })}
    </nav>
  );
}
