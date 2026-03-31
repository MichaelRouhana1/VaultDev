"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { SignOutButton, useSession, useUser } from "@clerk/nextjs";
import { isClerkAPIResponseError, isReverificationCancelledError } from "@clerk/nextjs/errors";
import { toast } from "sonner";
import { AccountPasswordInput } from "@/components/account/AccountPasswordInput";

const labelClass =
  "block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground mb-2";

function clerkErrorMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const first = err.errors?.[0];
    return first?.longMessage ?? first?.message ?? "Something went wrong";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
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
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const { isLoaded: sessionLoaded, session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!userLoaded || !sessionLoaded) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!isSignedIn || !user) {
    return <p className="text-sm text-muted-foreground">Sign in to change your password.</p>;
  }

  if (!user.passwordEnabled) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        This account doesn’t use an email and password — you signed in another way. There’s no password to change
        here.
      </p>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cur = currentPassword.trim();
    const next = newPassword;
    const confirm = confirmPassword;

    if (!cur) {
      toast.error("Enter your current password");
      return;
    }
    if (!meetsPasswordRules(next)) {
      toast.error("New password must be at least 8 characters and include uppercase, lowercase, and a number");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords don’t match");
      return;
    }
    if (next === cur) {
      toast.error("New password must be different from your current password");
      return;
    }
    if (!session) {
      toast.error("No active session. Refresh and try again.");
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
      toast.success("Password updated");
      router.refresh();
      onSuccess();
    } catch (err) {
      if (isReverificationCancelledError(err)) return;
      toast.error(clerkErrorMessage(err));
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
            label="Current password"
            labelClassName={labelClass}
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={busy}
          />
          <div className="flex flex-col items-end gap-1">
            <SignOutButton signOutOptions={{ redirectUrl: "/sign-in" }}>
              <button
                type="button"
                disabled={busy}
                className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
              >
                Forgot password?
              </button>
            </SignOutButton>
            <p className="max-w-[16rem] text-right text-[0.6rem] leading-snug text-muted-foreground/90">
              We’ll sign you out so you can request a reset link on the sign-in page.
            </p>
          </div>
        </div>
        <AccountPasswordInput
          id="chg-pw-new"
          label="New password"
          labelClassName={labelClass}
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          placeholder="NEW PASSWORD"
          disabled={busy}
        />
        <AccountPasswordInput
          id="chg-pw-confirm"
          label="Confirm new password"
          labelClassName={labelClass}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          placeholder="CONFIRM"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-primary px-10 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
