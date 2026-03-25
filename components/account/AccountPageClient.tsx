"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { updateVaultProfile } from "@/actions/updateVaultProfile";
import { AccountChangeEmailPanel } from "@/components/account/AccountChangeEmailPanel";
import { AccountChangePasswordPanel } from "@/components/account/AccountChangePasswordPanel";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import type { VaultProfileStored } from "@/lib/account-vault-profile";
import { cn } from "@/lib/utils";
import { Mail, Lock, Trash2 } from "lucide-react";

export type AccountOrderDto = {
  id: number;
  createdAt: string;
  status: string;
  totalAmount: string;
  items: {
    productName: string;
    size: string;
    quantity: number;
    priceAtPurchase: string;
  }[];
};

type Panel = "purchases" | "details" | "change-email" | "change-password";

const COUNTRY_CODES = [
  { value: "+961", label: "+961" },
  { value: "+1", label: "+1" },
  { value: "+44", label: "+44" },
  { value: "+33", label: "+33" },
  { value: "+49", label: "+49" },
];

const inputClass =
  "w-full border border-border bg-background px-3 py-2.5 text-sm tracking-wide text-foreground placeholder:text-muted-foreground rounded-none outline-none focus:border-foreground focus:ring-1 focus:ring-foreground";

const labelClass =
  "block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground mb-2";

type Props = {
  vaultTitle: string;
  email: string | null;
  initialFirstName: string;
  initialLastName: string;
  vaultProfile: VaultProfileStored | null;
  orders: AccountOrderDto[];
};

export function AccountPageClient({
  vaultTitle,
  email,
  initialFirstName,
  initialLastName,
  vaultProfile,
  orders,
}: Props) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("purchases");
  const [isSaving, startSave] = useTransition();

  const securityPanelTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panel !== "change-email" && panel !== "change-password") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    securityPanelTopRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [panel]);

  const v = vaultProfile ?? {};
  const b = v.billing ?? {};

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phoneCountryCode, setPhoneCountryCode] = useState(v.phoneCountryCode ?? "+961");
  const [phoneNumber, setPhoneNumber] = useState(v.phoneNumber ?? "");
  const [billingStreet, setBillingStreet] = useState(b.street ?? "");
  const [billingStairway, setBillingStairway] = useState(b.stairway ?? "");
  const [billingDistrict, setBillingDistrict] = useState(b.district ?? "");
  const [billingLocality, setBillingLocality] = useState(b.locality ?? "");

  const navBtn = (active: boolean) =>
    cn(
      "text-left text-sm font-medium uppercase tracking-[0.2em] transition-colors py-1",
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
    );

  const handleSave = () => {
    startSave(async () => {
      const res = await updateVaultProfile({
        firstName,
        lastName,
        phoneCountryCode,
        phoneNumber,
        billingStreet,
        billingStairway,
        billingDistrict,
        billingLocality,
      });
      if (res.ok) {
        toast.success("Saved");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const isSecurityFullscreen = panel === "change-email" || panel === "change-password";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground transition-colors">
      {isSecurityFullscreen ? (
        <div
          ref={securityPanelTopRef}
          className="mx-auto w-full max-w-[1600px] scroll-mt-20 px-6 py-6 lg:px-10 lg:py-8"
        >
          <button
            type="button"
            onClick={() => setPanel("details")}
            className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-foreground hover:opacity-70"
          >
            ← Back to personal details
          </button>
          <h2 className="mt-3 text-lg font-bold uppercase tracking-tight text-foreground lg:mt-3.5 lg:text-xl">
            {panel === "change-email" ? "Change email address" : "Change password"}
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground lg:mt-2">
            {panel === "change-email"
              ? `Current: ${email ?? "—"} — add a new address below, verify the code, and it becomes your sign-in email.`
              : "Use the secure form below. Your password must be at least 8 characters and include uppercase, lowercase, and a number."}
          </p>
          <div className="mt-5 flex w-full justify-center lg:mt-6">
            <div className="w-full max-w-3xl border border-border bg-card p-3 lg:max-w-4xl lg:p-4">
              {panel === "change-email" ? (
                <AccountChangeEmailPanel currentEmailLabel={email} onSuccess={() => setPanel("details")} />
              ) : (
                <AccountChangePasswordPanel onSuccess={() => setPanel("details")} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[1200px] gap-16 px-6 py-12 lg:gap-24">
          {/* Sidebar — hidden on email/password fullscreen */}
          <aside className="w-[200px] shrink-0 lg:w-[240px]">
            <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {vaultTitle}
            </h1>
            <nav className="mt-12 flex flex-col gap-8">
              <button type="button" className={navBtn(panel === "purchases")} onClick={() => setPanel("purchases")}>
                My purchases
              </button>
              <button type="button" className={navBtn(panel === "details")} onClick={() => setPanel("details")}>
                Personal details
              </button>
              <SignOutButton signOutOptions={{ redirectUrl: "/" }}>
                <button
                  type="button"
                  className="text-left text-sm font-semibold uppercase tracking-[0.2em] text-foreground hover:opacity-70"
                >
                  Log out
                </button>
              </SignOutButton>
            </nav>
          </aside>

          <main className="min-w-0 flex-1">
          {panel === "purchases" && (
            <div>
              {orders.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                  <p className="max-w-md text-sm font-semibold uppercase tracking-[0.15em] text-foreground">
                    You do not have any purchases yet
                  </p>
                  <Link
                    href="/streetwear/shop"
                    className="mt-8 bg-primary px-10 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:opacity-90"
                  >
                    Shop now
                  </Link>
                </div>
              ) : (
                <div className="space-y-10">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                    My purchases
                  </h2>
                  <ul className="space-y-8">
                    {orders.map((order) => (
                      <li key={order.id} className="border-b border-border pb-8 last:border-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
                            Order #{order.id}
                          </span>
                          <time className="text-xs text-muted-foreground" dateTime={order.createdAt}>
                            {new Date(order.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </time>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">
                            {order.status}
                          </span>
                          <span className="text-sm font-semibold text-foreground">${order.totalAmount}</span>
                        </div>
                        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                          {order.items.map((item, i) => (
                            <li key={i}>
                              {item.productName} · {item.size} × {item.quantity} · $
                              {typeof item.priceAtPurchase === "string"
                                ? item.priceAtPurchase
                                : String(item.priceAtPurchase)}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {panel === "details" && (
            <div className="max-w-2xl space-y-14">
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                  Personal details
                </h2>
                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="acct-first">
                      Name
                    </label>
                    <input
                      id="acct-first"
                      className={inputClass}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="NAME"
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="acct-last">
                      Surname
                    </label>
                    <input
                      id="acct-last"
                      className={inputClass}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="SURNAME"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <label className={labelClass}>Telephone</label>
                  <div className="flex gap-2">
                    <select
                      className={cn(inputClass, "w-[100px] shrink-0 cursor-pointer")}
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      aria-label="Country code"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inputClass}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="TELEPHONE"
                      autoComplete="tel-national"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                  Billing address
                </h2>
                <div className="mt-8 space-y-6">
                  <div>
                    <label className={labelClass} htmlFor="acct-street">
                      Street and number
                    </label>
                    <input
                      id="acct-street"
                      className={inputClass}
                      value={billingStreet}
                      onChange={(e) => setBillingStreet(e.target.value)}
                      placeholder="STREET AND NUMBER"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="acct-stair">
                      Stairway, floor…
                    </label>
                    <div className="relative">
                      <input
                        id="acct-stair"
                        className={inputClass}
                        value={billingStairway}
                        maxLength={15}
                        onChange={(e) => setBillingStairway(e.target.value)}
                        placeholder="STAIRWAY, FLOOR…"
                      />
                      <span className="pointer-events-none absolute bottom-2 right-3 text-[0.65rem] text-muted-foreground">
                        {billingStairway.length}/15
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="acct-district">
                        District
                      </label>
                      <select
                        id="acct-district"
                        className={cn(inputClass, "cursor-pointer")}
                        value={billingDistrict}
                        onChange={(e) => setBillingDistrict(e.target.value)}
                      >
                        <option value="">Select district</option>
                        <option value="Beirut">Beirut</option>
                        <option value="Mount Lebanon">Mount Lebanon</option>
                        <option value="North">North</option>
                        <option value="South">South</option>
                        <option value="Nabatieh">Nabatieh</option>
                        <option value="Bekaa">Bekaa</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="acct-locality">
                        Locality
                      </label>
                      <select
                        id="acct-locality"
                        className={cn(inputClass, "cursor-pointer")}
                        value={billingLocality}
                        onChange={(e) => setBillingLocality(e.target.value)}
                      >
                        <option value="">Select locality</option>
                        <option value="Beirut">Beirut</option>
                        <option value="Tripoli">Tripoli</option>
                        <option value="Sidon">Sidon</option>
                        <option value="Tyre">Tyre</option>
                        <option value="Zahle">Zahle</option>
                        <option value="Jounieh">Jounieh</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                  Account information
                </h2>
                <ul className="mt-6 divide-y divide-border border-t border-border">
                  <li className="flex items-center gap-4 py-5">
                    <Mail className="h-5 w-5 shrink-0 text-foreground" strokeWidth={1.25} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm uppercase tracking-wide text-foreground">
                      {email ?? "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPanel("change-email")}
                      className="shrink-0 text-xs font-semibold uppercase tracking-widest underline underline-offset-4 hover:opacity-70"
                    >
                      Change
                    </button>
                  </li>
                  <li className="flex items-center gap-4 py-5">
                    <Lock className="h-5 w-5 shrink-0 text-foreground" strokeWidth={1.25} aria-hidden />
                    <span className="flex-1 text-sm font-semibold uppercase tracking-wide text-foreground">
                      Password
                    </span>
                    <button
                      type="button"
                      onClick={() => setPanel("change-password")}
                      className="shrink-0 text-xs font-semibold uppercase tracking-widest underline underline-offset-4 hover:opacity-70"
                    >
                      Change
                    </button>
                  </li>
                  <li className="flex items-center gap-4 py-5">
                    <Trash2 className="h-5 w-5 shrink-0 text-destructive" strokeWidth={1.25} aria-hidden />
                    <DeleteAccountButton variant="link" label="Delete account" className="text-destructive" />
                  </li>
                </ul>
              </section>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary px-14 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          )}

          </main>
        </div>
      )}
    </div>
  );
}
