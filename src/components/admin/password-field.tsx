"use client";

import { useAdminLocale } from "@/components/admin/admin-locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function PasswordField({
  id,
  label,
  placeholder,
  autoComplete,
  value,
  onChange,
  invalid = false,
}: {
  id: string;
  label: string;
  placeholder: string;
  autoComplete: string;
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
}) {
  const { t } = useAdminLocale();
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={6}
          placeholder={placeholder}
          value={value}
          aria-invalid={invalid || undefined}
          className="pr-10"
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-base leading-none"
          aria-label={visible ? t.hidePassword : t.showPassword}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <span aria-hidden="true">{visible ? "🙈" : "👁️"}</span>
        </button>
      </div>
    </div>
  );
}
