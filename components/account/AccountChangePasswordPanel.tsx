"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { SignOutButton, useSession, useUser } from "@clerk/nextjs";
import { isClerkAPIResponseError, isReverificationCancelledError } from "@clerk/nextjs/errors";
import { toast } from "sonner";
import { AccountPasswordInput } from "@/components/account/AccountPasswordInput";

const labelClass =
  "block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground mb-2";

function clerkErrorMessage(err: unknown, fallback: string): string {
  if (isClerkAPIResponseError(err)) {
    const first = err.errors?.[0];
    return first?.longMessage ?? first?.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function meetsPasswordRules(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

type Props = {
  onSuccess: () => void;
};

export function AccountChangePasswordPanel({ onSuccess }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("AccountChangePassword");
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const { isLoaded: sessionLoaded, session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!userLoaded || !sessionLoaded) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }
  if (!isSignedIn || !user) {
    return <p className="text-sm text-muted-foreground">{t("signInToChange")}</p>;
  }

  if (!user.passwordEnabled) {
    return <p className="text-sm leading-relaxed text-muted-foreground">{t("noPasswordAccount")}</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cur = currentPassword.trim();
    const next = newPassword;
    const confirm = confirmPassword;

    if (!cur) {
      toast.error(t("toastEnterCurrent"));
      return;
    }
    if (!meetsPasswordRules(next)) {
      toast.error(t("toastRules"));
      return;
    }
    if (next !== confirm) {
      toast.error(t("toastMismatch"));
      return;
    }
    if (next === cur) {
      toast.error(t("toastSame"));
      return;
    }
    if (!session) {
      toast.error(t("toastNoSession"));
      return;
    }

    setBusy(true);
    try {
      await session.startVerification({ level: "first_factor" });
      await session.attemptFirstFactorVerification({ strategy: "password", password: cur });
      await user.updatePassword({
        currentPassword: cur,
        newPassword: next,
        signOutOfOtherSessions: true,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("toastUpdated"));
      router.refresh();
      onSuccess();
    } catch (err) {
      if (isReverificationCancelledError(err)) return;
      toast.error(clerkErrorMessage(err, t("genericError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 py-2">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <AccountPasswordInput
            id="chg-pw-current"
            label={t("labelCurrent")}
            labelClassName={labelClass}
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={busy}
          />
          <div className="flex flex-col items-end gap-1">
            <SignOutButton signOutOptions={{ redirectUrl: `/${locale}/sign-in` }}>
              <button
                type="button"
                disabled={busy}
                className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
              >
                {t("forgotPassword")}
              </button>
            </SignOutButton>
            <p className="max-w-[16rem] text-end text-[0.6rem] leading-snug text-muted-foreground/90">
              {t("forgotHint")}
            </p>
          </div>
        </div>
        <AccountPasswordInput
          id="chg-pw-new"
          label={t("labelNew")}
          labelClassName={labelClass}
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          placeholder={t("phNew")}
          disabled={busy}
        />
        <AccountPasswordInput
          id="chg-pw-confirm"
          label={t("labelConfirm")}
          labelClassName={labelClass}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          placeholder={t("phConfirm")}
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-10"
        >
          {busy ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}
