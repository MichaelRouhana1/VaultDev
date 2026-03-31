"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { updateVaultProfile } from "@/actions/updateVaultProfile";
import { AccountChangeEmailPanel } from "@/components/account/AccountChangeEmailPanel";
import { AccountChangePasswordPanel } from "@/components/account/AccountChangePasswordPanel";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import type { VaultProfileStored } from "@/lib/account-vault-profile";
import { cn } from "@/lib/utils";
import { orderNumberOrFallback } from "@/lib/order-reference";
import { OrderNumberWithCopy } from "@/components/orders/OrderNumberWithCopy";
import { ChevronDown, Mail, Lock, Package, Trash2 } from "lucide-react";

export type AccountOrderItemDto = {
  productName: string;
  size: string;
  quantity: number;
  priceAtPurchase: string;
  productImageUrl?: string | null;
};

export type AccountOrderDto = {
  id: number;
  orderNumber: string;
  createdAt: string;
  status: string;
  subtotalAmount: string;
  shippingFee: string;
  discountAmount: string;
  totalAmount: string;
  shipping: {
    name: string;
    phone: string;
    line1: string;
    city: string;
  };
  items: AccountOrderItemDto[];
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

function formatUsd(amount: string): string {
  const n = parseFloat(amount);
  if (!Number.isFinite(n)) return amount;
  return n.toFixed(2);
}

function parseAmount(amount: string): number {
  const n = parseFloat(amount);
  return Number.isFinite(n) ? n : 0;
}

function orderStatusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  switch (s) {
    case "DELIVERED":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30";
    case "SHIPPED":
      return "bg-sky-500/15 text-sky-900 dark:text-sky-100 border-sky-500/30";
    case "PROCESSING":
      return "bg-amber-500/15 text-amber-950 dark:text-amber-100 border-amber-500/35";
    case "CANCELLED":
      return "bg-destructive/10 text-destructive border-destructive/25";
    case "PENDING":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function orderStatusLabel(status: string): string {
  const s = status.toUpperCase();
  const map: Record<string, string> = {
    PENDING: "Pending",
    PROCESSING: "Processing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };
  return map[s] ?? status;
}

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
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const securityPanelTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panel !== "purchases") setExpandedOrderId(null);
  }, [panel]);

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
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                      Order history
                    </h2>
                    <p className="mt-2 max-w-xl text-xs text-muted-foreground leading-relaxed">
                      View details, line items, and shipping for each order. Select an order to expand.
                    </p>
                  </div>
                  <ul className="flex flex-col gap-4">
                    {orders.map((order) => {
                      const expanded = expandedOrderId === order.id;
                      const placed = new Date(order.createdAt);
                      const placedLabel = placed.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      });
                      const discountNum = parseAmount(order.discountAmount);
                      const shippingNum = parseAmount(order.shippingFee);
                      const items = order.items ?? [];

                      const toggleExpanded = () =>
                        setExpandedOrderId((id) => (id === order.id ? null : order.id));

                      return (
                        <li
                          key={order.id}
                          className="overflow-hidden rounded-none border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="group flex w-full flex-wrap items-start gap-x-3 gap-y-3 px-4 py-4 transition-colors hover:bg-muted/40 md:flex-nowrap md:items-center md:gap-4 md:px-5 md:py-5">
                            <div className="min-w-0 shrink-0 pt-0.5 md:pt-0">
                              <OrderNumberWithCopy
                                orderNumber={orderNumberOrFallback(order.orderNumber, order.id)}
                                className="flex-wrap"
                              />
                            </div>
                            <div
                              role="button"
                              tabIndex={0}
                              aria-expanded={expanded}
                              aria-label={`${expanded ? "Collapse" : "Expand"} order ${orderNumberOrFallback(order.orderNumber, order.id)}`}
                              className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:items-center md:gap-4"
                              onClick={toggleExpanded}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleExpanded();
                                }
                              }}
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Placed on{" "}
                                  <time dateTime={order.createdAt}>{placedLabel}</time>
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
                                <div className="text-right">
                                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                                    Total
                                  </p>
                                  <p className="text-base font-semibold tabular-nums text-foreground">
                                    ${formatUsd(order.totalAmount)}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "inline-flex border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider",
                                    orderStatusBadgeClass(order.status),
                                  )}
                                >
                                  {orderStatusLabel(order.status)}
                                </span>
                                <ChevronDown
                                  className={cn(
                                    "size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out",
                                    expanded && "rotate-180",
                                  )}
                                  aria-hidden
                                />
                              </div>
                            </div>
                          </div>

                          <div
                            className={cn(
                              "grid transition-[grid-template-rows] duration-300 ease-in-out",
                              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                            )}
                          >
                            <div className="min-h-0 overflow-hidden">
                              <div className="border-t border-border bg-muted/40 px-4 py-6 md:px-5">
                                <div className="space-y-6">
                                  <div>
                                    <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                      Items
                                    </h3>
                                    <ul className="mt-4 space-y-4">
                                      {items.length === 0 ? (
                                        <li className="text-sm text-muted-foreground">
                                          No line items recorded for this order.
                                        </li>
                                      ) : (
                                        items.map((item, i) => {
                                          const lineTotal =
                                            parseAmount(item.priceAtPurchase) * item.quantity;
                                          const src = item.productImageUrl?.trim();
                                          return (
                                            <li
                                              key={`${order.id}-${i}-${item.productName}`}
                                              className="flex gap-4 border-b border-border/60 pb-4 last:border-0 last:pb-0"
                                            >
                                              <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-border bg-muted">
                                                {src ? (
                                                  <Image
                                                    src={src}
                                                    alt={item.productName}
                                                    fill
                                                    className="object-cover"
                                                    sizes="64px"
                                                  />
                                                ) : (
                                                  <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                    <Package className="size-6" strokeWidth={1.25} />
                                                  </span>
                                                )}
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium leading-snug text-foreground">
                                                  {item.productName}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                  Size {item.size}
                                                </p>
                                                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                  <span>Qty: {item.quantity}</span>
                                                  <span className="tabular-nums">
                                                    ${formatUsd(item.priceAtPurchase)} each
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="shrink-0 text-right">
                                                <p className="text-sm font-semibold tabular-nums text-foreground">
                                                  ${formatUsd(String(lineTotal))}
                                                </p>
                                              </div>
                                            </li>
                                          );
                                        })
                                      )}
                                    </ul>
                                  </div>

                                  <div className="flex flex-col gap-6 border-t border-border/80 pt-6 sm:flex-row sm:justify-between">
                                    <div className="max-w-md space-y-1 text-sm">
                                      <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                        Shipping address
                                      </h3>
                                      <p className="font-medium text-foreground">
                                        {order.shipping?.name ?? "—"}
                                      </p>
                                      <p className="text-muted-foreground">{order.shipping?.line1 ?? "—"}</p>
                                      <p className="text-muted-foreground">{order.shipping?.city ?? "—"}</p>
                                      <p className="text-muted-foreground tabular-nums">
                                        {order.shipping?.phone ?? "—"}
                                      </p>
                                    </div>

                                    <div className="w-full max-w-xs space-y-2 sm:text-right">
                                      <h3 className="text-left text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-right">
                                        Summary
                                      </h3>
                                      <div className="space-y-1.5 text-sm">
                                        <div className="flex justify-between gap-4 tabular-nums">
                                          <span className="text-muted-foreground">Subtotal</span>
                                          <span>${formatUsd(order.subtotalAmount)}</span>
                                        </div>
                                        {discountNum > 0 && (
                                          <div className="flex justify-between gap-4 tabular-nums text-emerald-700 dark:text-emerald-400">
                                            <span>Discount</span>
                                            <span>−${formatUsd(order.discountAmount)}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between gap-4 tabular-nums">
                                          <span className="text-muted-foreground">Shipping</span>
                                          <span>
                                            {shippingNum <= 0
                                              ? "Free"
                                              : `$${formatUsd(order.shippingFee)}`}
                                          </span>
                                        </div>
                                        <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold tabular-nums">
                                          <span>Total</span>
                                          <span>${formatUsd(order.totalAmount)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-3 border-t border-border/80 pt-6">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.alert("Tracking is not available for this order yet.");
                                      }}
                                      className="border border-border bg-background px-4 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-muted"
                                    >
                                      Track order
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.alert(
                                          "Please email support from the address on your account for order help.",
                                        );
                                      }}
                                      className="border border-transparent px-4 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                    >
                                      Contact support
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
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
