"use client";

import {
  deleteRestaurantStaff,
  saveRestaurantStaff,
  type StaffMember,
} from "@/app/admin/staff/actions";
import { useAdminLocale } from "@/components/admin/admin-locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { KeyRoundIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function roleLabel(
  role: StaffMember["role"],
  t: ReturnType<typeof useAdminLocale>["t"],
) {
  if (role === "owner") return t.roleOwner;
  if (role === "manager") return t.roleManager;
  return t.roleWaiter;
}

export function StaffManager({
  staff,
  restaurantId,
  restaurantName,
}: {
  staff: StaffMember[];
  restaurantId: string;
  restaurantName: string;
}) {
  const { t } = useAdminLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "waiter">("waiter");
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);

  async function save() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (editing) {
        const form = new FormData();
        form.set("id", editing.id);
        form.set("email", email);
        form.set("role", role);
        const result = await saveRestaurantStaff(form);
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        const res = await fetch("/api/staff/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            role,
            restaurant_id: restaurantId,
            restaurant_name: restaurantName,
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? t.sendingInvite);
          return;
        }
        setSuccess(t.inviteSent);
        window.setTimeout(() => setSuccess(null), 4000);
      }
      setEmail("");
      setRole("waiter");
      setEditing(null);
      router.refresh();
    } catch {
      setError("Could not send invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: StaffMember) {
    if (row.legacy || row.role === "owner") {
      setError(t.cannotDeleteOwner);
      return;
    }
    if (!window.confirm(t.deleteConfirm)) return;
    setBusy(true);
    const result = await deleteRestaurantStaff(row.id);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (editing?.id === row.id) {
      setEditing(null);
      setEmail("");
    }
    setError(null);
    router.refresh();
  }

  function openReset(row: StaffMember) {
    setResetting(row);
    setNewPassword("");
    setResetError(null);
  }

  function generatePassword() {
    const token = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
    setNewPassword(`SmartMenu${token}!`);
  }

  async function resetPassword() {
    if (!resetting) return;
    const password = newPassword.trim();
    if (password && password.length < 6) {
      setResetError(t.passwordTooShort);
      return;
    }
    setBusy(true);
    setResetError(null);
    try {
      const res = await fetch("/api/staff/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetting.email,
          password: password || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setResetError(json.error ?? t.resetPassword);
        return;
      }
      setResetting(null);
      setNewPassword("");
      setSuccess(t.passwordChanged);
      window.setTimeout(() => setSuccess(null), 4000);
    } catch {
      setResetError(t.resetPassword);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_160px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="staff-email">{t.staffEmail}</Label>
          <Input
            id="staff-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="staff@restaurant.ge"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="staff-role">{t.staffRole}</Label>
          <select
            id="staff-role"
            className="border-input h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
            value={role}
            onChange={(event) =>
              setRole(event.target.value === "manager" ? "manager" : "waiter")
            }
          >
            <option value="manager">{t.roleManager}</option>
            <option value="waiter">{t.roleWaiter}</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={busy}>
            {busy && !editing
              ? t.sendingInvite
              : editing
                ? t.saveChanges
                : t.addStaff}
          </Button>
        </div>
        {error ? (
          <p className="text-destructive text-sm sm:col-span-3">{error}</p>
        ) : null}
        {success ? (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:col-span-3"
          >
            {success}
          </p>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">{t.staffEmail}</th>
              <th className="px-3 py-2 font-medium">{t.staffRole}</th>
              <th className="px-3 py-2 font-medium">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td className="text-muted-foreground px-3 py-6" colSpan={3}>
                  {t.noStaff}
                </td>
              </tr>
            ) : (
              staff.map((row) => (
                <tr key={row.id} className="border-t border-secondary/20">
                  <td className="px-3 py-2">
                    {row.email}
                    {row.legacy ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t.legacyOwner}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={row.role === "owner" ? "default" : "outline"}>
                      {roleLabel(row.role, t)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {row.role === "owner" || row.legacy ? (
                      <span className="text-muted-foreground text-xs">
                        {t.cannotDeleteOwner}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            setEditing(row);
                            setEmail(row.email);
                            setRole(row.role === "manager" ? "manager" : "waiter");
                          }}
                        >
                          {t.edit}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void remove(row)}
                        >
                          {t.delete}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          disabled={busy}
                          onClick={() => openReset(row)}
                        >
                          <KeyRoundIcon className="size-3.5" />
                          {t.resetPassword}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(resetting)}
        onOpenChange={(open) => {
          if (!open) setResetting(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.resetPassword}</DialogTitle>
            <DialogDescription>{resetting?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="staff-new-password">{t.newPassword}</Label>
              <Input
                id="staff-new-password"
                type="text"
                autoComplete="new-password"
                minLength={6}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="SmartMenu2026!"
              />
            </div>
            {resetError ? (
              <p className="text-destructive text-sm">{resetError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={generatePassword}
            >
              {t.generateSecret}
            </Button>
            <Button
              type="button"
              disabled={busy || (newPassword.trim().length > 0 && newPassword.trim().length < 6)}
              onClick={() => void resetPassword()}
            >
              {t.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
