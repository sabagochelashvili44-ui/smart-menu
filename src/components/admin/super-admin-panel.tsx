"use client";

import {
  createSuperAdminRestaurant,
  deleteSuperAdminRestaurant,
  enterSuperAdminViewAs,
  toggleSuperAdminSubscription,
  updateSuperAdminRestaurant,
  type SuperAdminKpis,
  type SuperAdminRestaurant,
} from "@/app/admin/super-admin/actions";
import { useAdminLocale } from "@/components/admin/admin-locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLoginUrl, getPublicAppUrl, publicMenuUrl } from "@/lib/app-url";
import { formatGel } from "@/lib/menu-copy";
import {
  DEFAULT_BRAND,
  brandCssVars,
  normalizeHex,
  restaurantLogo,
  restaurantPublicKey,
  slugifyRestaurant,
} from "@/lib/restaurant-brand";
import type { SubscriptionStatus } from "@/lib/super-admin-shared";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function SuperAdminPanel({
  kpis,
  restaurants,
}: {
  kpis: SuperAdminKpis;
  restaurants: SuperAdminRestaurant[];
}) {
  const { t } = useAdminLocale();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SuperAdminRestaurant | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [onboarded, setOnboarded] = useState<{
    name: string;
    slug: string;
    manager_email: string | null;
  } | null>(null);

  const derivedKpis = useMemo(() => {
    const active = restaurants.filter((row) => row.subscription_status === "active");
    return {
      totalRestaurants: restaurants.length,
      activeSubscribers: active.length,
      mrr: active.reduce((sum, row) => sum + row.subscription_fee, 0),
      totalOrders: kpis.totalOrders,
    };
  }, [kpis.totalOrders, restaurants]);

  async function onViewAs(id: string) {
    setBusyId(id);
    const result = await enterSuperAdminViewAs(id);
    if (!result.error) {
      window.location.href = `/admin?impersonate_restaurant_id=${encodeURIComponent(id)}`;
      return;
    }
    setBusyId(null);
  }

  async function onToggle(id: string) {
    setBusyId(id);
    await toggleSuperAdminSubscription(id);
    setBusyId(null);
    router.refresh();
  }

  async function onDelete(row: SuperAdminRestaurant) {
    if (!window.confirm(`${t.deleteTenantConfirm} (${row.name})`)) return;
    setBusyId(row.id);
    await deleteSuperAdminRestaurant(row.id);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title={t.totalRestaurants} value={String(derivedKpis.totalRestaurants)} />
        <Kpi title={t.activeSubscribers} value={String(derivedKpis.activeSubscribers)} />
        <Kpi title={t.monthlyRevenue} value={formatGel(derivedKpis.mrr)} />
        <Kpi title={t.networkOrders} value={String(derivedKpis.totalOrders)} />
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={() => setCreateOpen(true)}>
          {t.addRestaurant}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-secondary/30">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">{t.restaurantName}</th>
              <th className="px-3 py-2 font-medium">{t.slug}</th>
              <th className="px-3 py-2 font-medium">{t.managerEmail}</th>
              <th className="px-3 py-2 font-medium">{t.subscriptionStatus}</th>
              <th className="px-3 py-2 font-medium">{t.monthlyFee}</th>
              <th className="px-3 py-2 font-medium">{t.tenantOrders}</th>
              <th className="px-3 py-2 font-medium">{t.expirationDate}</th>
              <th className="px-3 py-2 font-medium">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.length === 0 ? (
              <tr>
                <td className="text-muted-foreground px-3 py-6" colSpan={8}>
                  {t.noTenants}
                </td>
              </tr>
            ) : (
              restaurants.map((row) => {
                const slug = restaurantPublicKey(row);
                const expired =
                  row.valid_until && new Date(row.valid_until).getTime() < Date.now();
                return (
                  <tr key={row.id} className="border-t border-secondary/20">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.slug ?? "—"}</td>
                    <td className="px-3 py-2">{row.manager_email ?? "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.subscription_status} expired={Boolean(expired)} />
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatGel(row.subscription_fee)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="secondary"
                        className="h-auto min-h-5 py-1 tabular-nums font-semibold"
                      >
                        {t.tenantOrderCount.replace(
                          "{count}",
                          String(row.order_count ?? 0),
                        )}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.valid_until
                        ? new Date(row.valid_until).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id}
                          onClick={() => void onViewAs(row.id)}
                        >
                          {t.viewAsManager}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id}
                          onClick={() => void onToggle(row.id)}
                        >
                          {row.subscription_status === "active"
                            ? t.suspendTenant
                            : t.activateTenant}
                        </Button>
                        <Button size="sm" variant="ghost" render={<a href={`/menu/${slug}`} target="_blank" rel="noreferrer" />}>
                          {t.openMenu}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(row)}
                        >
                          {t.editTenant}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busyId === row.id}
                          onClick={() => void onDelete(row)}
                        >
                          {t.deleteTenant}
                        </Button>
                      </div>
                      <div className="mt-2 max-w-xs">
                        <CopyLinkField url={adminLoginUrl(slug)} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-xs">
        {getPublicAppUrl()}/menu/[slug]
      </p>

      <TenantDialog
        open={createOpen}
        title={t.addRestaurant}
        restaurant={null}
        onOpenChange={setCreateOpen}
        onSaved={(created) => {
          setCreateOpen(false);
          if (created) setOnboarded(created);
          router.refresh();
        }}
      />
      <TenantDialog
        open={Boolean(editing)}
        title={t.editTenant}
        restaurant={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
      <OnboardSuccessDialog
        tenant={onboarded}
        onOpenChange={(open) => {
          if (!open) setOnboarded(null);
        }}
      />
    </div>
  );
}

function StatusBadge({
  status,
  expired,
}: {
  status: SubscriptionStatus;
  expired: boolean;
}) {
  const { t } = useAdminLocale();
  const label =
    status === "active"
      ? t.statusActive
      : status === "trial"
        ? t.statusTrial
        : t.statusSuspended;
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge
        variant={
          status === "suspended"
            ? "destructive"
            : status === "trial"
              ? "outline"
              : "default"
        }
      >
        {label}
      </Badge>
      {expired ? <Badge variant="outline">{t.expired}</Badge> : null}
    </span>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-primary text-2xl font-semibold tabular-nums">
        {value}
      </CardContent>
    </Card>
  );
}

function TenantDialog({
  open,
  title,
  restaurant,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  title: string;
  restaurant: SuperAdminRestaurant | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (created?: {
    name: string;
    slug: string;
    manager_email: string | null;
  }) => void;
}) {
  const { t } = useAdminLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(restaurant?.name ?? "");
  const [slug, setSlug] = useState(restaurant?.slug ?? "");
  const [email, setEmail] = useState(restaurant?.manager_email ?? "");
  const [fee, setFee] = useState(String(restaurant?.subscription_fee ?? "49"));
  const [serviceFeePercent, setServiceFeePercent] = useState(
    String(restaurant?.service_fee_percent ?? 0),
  );
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    restaurant?.google_maps_review_url ?? restaurant?.google_review_url ?? "",
  );
  const [status, setStatus] = useState<SubscriptionStatus>(
    restaurant?.subscription_status ?? "trial",
  );
  const [validUntil, setValidUntil] = useState(
    toDatetimeLocal(restaurant?.valid_until ?? null),
  );
  const [primary, setPrimary] = useState(
    normalizeHex(restaurant?.primary_color, DEFAULT_BRAND.primary_color),
  );
  const [secondary, setSecondary] = useState(
    normalizeHex(restaurant?.secondary_color, DEFAULT_BRAND.secondary_color),
  );
  const [bg, setBg] = useState(
    normalizeHex(restaurant?.bg_color, DEFAULT_BRAND.bg_color),
  );
  const [logoUrl, setLogoUrl] = useState(restaurantLogo(restaurant ?? {}) ?? "");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const isEdit = Boolean(restaurant);

  useEffect(() => {
    if (!open) return;
    setName(restaurant?.name ?? "");
    setSlug(restaurant?.slug ?? "");
    setEmail(restaurant?.manager_email ?? "");
    setFee(String(restaurant?.subscription_fee ?? "49"));
    setServiceFeePercent(String(restaurant?.service_fee_percent ?? 0));
    setGoogleMapsUrl(
      restaurant?.google_maps_review_url ?? restaurant?.google_review_url ?? "",
    );
    setStatus(restaurant?.subscription_status ?? "trial");
    setValidUntil(toDatetimeLocal(restaurant?.valid_until ?? null));
    setPrimary(normalizeHex(restaurant?.primary_color, DEFAULT_BRAND.primary_color));
    setSecondary(
      normalizeHex(restaurant?.secondary_color, DEFAULT_BRAND.secondary_color),
    );
    setBg(normalizeHex(restaurant?.bg_color, DEFAULT_BRAND.bg_color));
    setLogoUrl(restaurantLogo(restaurant ?? {}) ?? "");
    setLogoPreview(null);
    setError(null);
  }, [open, restaurant]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const previewVars = useMemo(
    () =>
      brandCssVars({
        id: restaurant?.id ?? "preview",
        name,
        primary_color: primary,
        secondary_color: secondary,
        bg_color: bg,
      }) as CSSProperties,
    [restaurant?.id, name, primary, secondary, bg],
  );

  const previewLogo = logoPreview || logoUrl;
  const previewSlug = slugifyRestaurant(slug || name) || "machakhela";

  function onNameChange(next: string) {
    const previousAuto = slugifyRestaurant(name);
    setName(next);
    if (!isEdit && (!slug || slug === previousAuto)) {
      setSlug(slugifyRestaurant(next));
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    if (restaurant) form.set("id", restaurant.id);
    form.set("name", name);
    form.set("slug", slugifyRestaurant(slug || name));
    form.set("manager_email", email);
    form.set("subscription_fee", fee);
    form.set("service_fee_percent", serviceFeePercent);
    form.set("google_maps_review_url", googleMapsUrl);
    form.set("google_review_url", googleMapsUrl);
    form.set("subscription_status", status);
    form.set("valid_until", validUntil);
    form.set("primary_color", primary);
    form.set("secondary_color", secondary);
    form.set("bg_color", bg);
    form.set("logo_url", logoUrl);
    const result = restaurant
      ? await updateSuperAdminRestaurant(form)
      : await createSuperAdminRestaurant(form);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (!restaurant) {
      onSaved({
        name,
        slug: slugifyRestaurant(slug || name),
        manager_email: email.trim() || null,
      });
      return;
    }
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={onSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{t.superAdminFormHint}</DialogDescription>
          </DialogHeader>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t.tenantBasics}</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t.tenantName}>
                <Input
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  required
                />
              </Field>
              <Field label={t.slug}>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={t.slugExample}
                />
              </Field>
              <Field label={t.managerEmail}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.serviceFeePercent}>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={serviceFeePercent}
                  onChange={(e) => setServiceFeePercent(e.target.value)}
                  placeholder="10"
                />
              </Field>
              <Field label={t.googleReviewUrl}>
                <Input
                  type="url"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder={t.googleReviewPlaceholder}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t.tenantVisuals}</h3>
            <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorField
                  label={t.primaryVar}
                  value={primary}
                  onChange={setPrimary}
                />
                <ColorField
                  label={t.secondaryVar}
                  value={secondary}
                  onChange={setSecondary}
                />
                <ColorField label={t.bgVar} value={bg} onChange={setBg} />
                <Field label={t.logo}>
                  <Input
                    name="logo"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (logoPreview) URL.revokeObjectURL(logoPreview);
                      setLogoPreview(file ? URL.createObjectURL(file) : null);
                    }}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={t.logoUrl}>
                    <Input
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://"
                    />
                  </Field>
                </div>
              </div>
              <aside
                className="rounded-xl border border-secondary/30 p-4"
                style={previewVars}
              >
                <p className="text-muted-foreground mb-3 text-xs uppercase tracking-wide">
                  {t.preview}
                </p>
                <div className="flex items-center gap-3">
                  {previewLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewLogo}
                      alt=""
                      className="size-12 rounded-full object-cover ring-1 ring-foreground/10"
                    />
                  ) : (
                    <div className="bg-muted flex size-12 items-center justify-center rounded-full text-lg font-semibold">
                      {(name || "R").slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{name || t.tenantName}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      /menu/{previewSlug}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs">
                    --primary
                  </span>
                  <span className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs">
                    --secondary
                  </span>
                  <span className="rounded-md border border-foreground/15 px-2 py-1 text-xs">
                    --background
                  </span>
                </div>
              </aside>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t.tenantSubscription}</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t.monthlyFee}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                />
              </Field>
              <Field label={t.subscriptionStatus}>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as SubscriptionStatus)
                  }
                  className="border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm"
                >
                  <option value="active">{t.statusActive}</option>
                  <option value="trial">{t.statusTrial}</option>
                  <option value="suspended">{t.statusSuspended}</option>
                </select>
              </Field>
              <Field label={t.expirationDate}>
                <Input
                  type="datetime-local"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </Field>
            </div>
          </section>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "…" : isEdit ? t.saveSettings : t.addRestaurant}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-input h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function CopyLinkField({
  url,
  label,
}: {
  url: string;
  label?: string;
}) {
  const { t } = useAdminLocale();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement("textarea");
      field.value = url;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-1">
      {label ? <Label>{label}</Label> : null}
      <div className="flex gap-2">
        <Input readOnly value={url} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          className="shrink-0 whitespace-nowrap"
          onClick={() => void copy()}
        >
          {copied ? `✓ ${t.linkCopied}` : t.copyLink}
        </Button>
      </div>
    </div>
  );
}

function OnboardSuccessDialog({
  tenant,
  onOpenChange,
}: {
  tenant: { name: string; slug: string; manager_email: string | null } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useAdminLocale();
  if (!tenant) return null;

  return (
    <Dialog open={Boolean(tenant)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.onboardSuccess}</DialogTitle>
          <DialogDescription>
            {tenant.name}
            {tenant.manager_email ? ` · ${tenant.manager_email}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <CopyLinkField label={t.menuLink} url={publicMenuUrl(tenant.slug)} />
          <CopyLinkField
            label={t.adminLoginLink}
            url={adminLoginUrl(tenant.slug)}
          />
          <p className="text-muted-foreground text-sm">{t.sendToOwner}</p>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t.saved}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
