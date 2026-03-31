"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useReverification, useSession, useUser } from "@clerk/nextjs";
import { isClerkAPIResponseError, isReverificationCancelledError } from "@clerk/nextjs/errors";
import { toast } from "sonner";
import { AccountPasswordInput } from "@/components/account/AccountPasswordInput";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full border border-border bg-background px-3 py-2.5 text-sm tracking-wide text-foreground placeholder:text-muted-foreground rounded-none outline-none focus:border-foreground focus:ring-1 focus:ring-foreground";

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

type Props = {
  /** Shown for context; live primary is read from `useUser()` when submitting. */
  currentEmailLabel: string | null;
  onSuccess: () => void;
};

export function AccountChangeEmailPanel({ currentEmailLabel, onSuccess }: Props) {
  const router = useRouter();
  const t = useTranslations("AccountChangeEmail");
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const { isLoaded: sessionLoaded, session } = useSession();
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [pendingEmailId, setPendingEmailId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previousPrimaryIdRef = useRef<string | null>(null);

  const createEmailAddress = useReverification((email: string) => user!.createEmailAddress({ email }));
  const updatePrimary = useReverification((primaryEmailAddressId: string) =>
    user!.update({ primaryEmailAddressId }),
  );
  const removeEmailAddress = useReverification(async (emailAddressId: string) => {
    const ea = user!.emailAddresses.find((a) => a.id === emailAddressId);
    if (ea) await ea.destroy();
  });

  if (!userLoaded || !sessionLoaded) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }
  if (!isSignedIn || !user) {
    return <p className="text-sm text-muted-foreground">{t("signInToChange")}</p>;
  }

  const primary = user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
  const displayCurrent = primary ?? currentEmailLabel?.toLowerCase() ?? null;

  const resetFlow = () => {
    setStep("enter");
    setCurrentPassword("");
    setNewEmail("");
    setCode("");
    setPendingEmailId(null);
    previousPrimaryIdRef.current = null;
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) {
      toast.error(t("toastEnterEmail"));
      return;
    }
    if (displayCurrent && trimmed === displayCurrent) {
      toast.error(t("toastDifferentEmail"));
      return;
    }
    if (user.passwordEnabled) {
      const pw = currentPassword.trim();
      if (!pw) {
        toast.error(t("toastEnterPassword"));
        return;
      }
      if (!session) {
        toast.error(t("toastNoSession"));
        return;
      }
      try {
        await session.startVerification({ level: "first_factor" });
        await session.attemptFirstFactorVerification({ strategy: "password", password: pw });
      } catch (err) {
        if (isReverificationCancelledError(err)) return;
        toast.error(clerkErrorMessage(err, t("genericError")));
        return;
      }
    }
    setBusy(true);
    previousPrimaryIdRef.current = user.primaryEmailAddressId;
    try {
      const created = await createEmailAddress(trimmed);
      await user.reload();
      const ea = user.emailAddresses.find((a) => a.id === created.id);
      if (!ea) {
        toast.error(t("toastLoadEmail"));
        return;
      }
      await ea.prepareVerification({ strategy: "email_code" });
      setPendingEmailId(ea.id);
      setStep("verify");
      toast.success(t("toastCodeSentTitle"), {
        description: t("toastCodeSentDesc", { email: trimmed }),
      });
    } catch (err) {
      if (isReverificationCancelledError(err)) return;
      toast.error(clerkErrorMessage(err, t("genericError")));
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyAndSetPrimary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingEmailId) {
      toast.error(t("toastStartOver"));
      return;
    }
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      toast.error(t("toastEnterCode"));
      return;
    }
    setBusy(true);
    try {
      const ea = user.emailAddresses.find((a) => a.id === pendingEmailId);
      if (!ea) {
        toast.error(t("toastExpired"));
        resetFlow();
        return;
      }
      const updated = await ea.attemptVerification({ code: trimmedCode });
      if (updated.verification?.status !== "verified") {
        toast.error(t("toastInvalidCode"));
        return;
      }
      await updatePrimary(updated.id);
      await user.reload();
      const prev = previousPrimaryIdRef.current;
      if (prev && prev !== updated.id) {
        try {
          await removeEmailAddress(prev);
          await user.reload();
        } catch {
          // Primary is already updated; old address may be tied to SSO — safe to leave listed
        }
      }
      toast.success(t("toastUpdated"));
      resetFlow();
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
    <div className="mx-auto max-w-md space-y-6 py-2">
      {step === "enter" && (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="change-email-old">
              {t("labelOldEmail")}
            </label>
            <input
              id="change-email-old"
              type="email"
              readOnly
              aria-readonly="true"
              className={cn(inputClass, "cursor-default bg-muted/30 text-muted-foreground")}
              value={user.primaryEmailAddress?.emailAddress ?? currentEmailLabel ?? "—"}
              tabIndex={-1}
            />
          </div>
          {user.passwordEnabled && (
            <AccountPasswordInput
              id="change-email-password"
              label={t("labelCurrentPassword")}
              labelClassName={labelClass}
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={busy}
            />
          )}
          <div>
            <label className={labelClass} htmlFor="change-email-new">
              {t("labelNewEmail")}
            </label>
            <input
              id="change-email-new"
              type="email"
              autoComplete="email"
              className={inputClass}
              value={newEmail}
              onChange={(ev) => setNewEmail(ev.target.value)}
              placeholder={t("phNewEmail")}
              disabled={busy}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="bg-primary px-10 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? t("sending") : t("sendCode")}
          </button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={handleVerifyAndSetPrimary} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="change-email-code">
              {t("labelCode")}
            </label>
            <input
              id="change-email-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={inputClass}
              value={code}
              onChange={(ev) => setCode(ev.target.value)}
              placeholder={t("phCode")}
              disabled={busy}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className="bg-primary px-10 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? t("verifying") : t("verifySubmit")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={resetFlow}
              className="border border-border bg-background px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-muted disabled:opacity-50"
            >
              {t("startOver")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
