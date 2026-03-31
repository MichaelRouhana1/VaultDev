"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";

const inputClass =
  "w-full border border-border bg-background py-2.5 ps-3 pe-10 text-sm tracking-wide text-foreground placeholder:text-muted-foreground rounded-none outline-none focus:border-foreground focus:ring-1 focus:ring-foreground";

type Props = {
  id: string;
  label: string;
  labelClassName: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function AccountPasswordInput({
  id,
  label,
  labelClassName,
  value,
  onChange,
  autoComplete,
  placeholder,
  disabled,
  className,
}: Props) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("AccountPassword");

  return (
    <div className={className}>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          className={inputClass}
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck={false}
        />
        <button
          type="button"
          className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-foreground hover:opacity-70 disabled:pointer-events-none disabled:opacity-40"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? t("hidePassword") : t("showPassword")}
        >
          {visible ? (
            <EyeOff className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
          ) : (
            <Eye className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
