"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
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
  const locale = useLocale();
  const t = useTranslations("Account");
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
      "text-start text-sm font-medium uppercase tracking-[0.2em] transition-colors py-1",
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
    );

  const orderStatusLabel = (status: string): string => {
    const s = status.toUpperCase();
    switch (s) {
      case "PENDING":
        return t("statusPending");
      case "PROCESSING":
        return t("statusProcessing");
      case "SHIPPED":
        return t("statusShipped");
      case "DELIVERED":
        return t("statusDelivered");
      case "CANCELLED":
        return t("statusCancelled");
      default:
        return status;
    }
  };

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
        toast.success(t("toastSaved"));
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
          className="mx-auto w-full max-w-[1600px] scroll-mt-20 px-4 py-6 sm:px-6 lg:px-10 lg:py-8"
        >
          <button
            type="button"
            onClick={() => setPanel("details")}
            className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-foreground hover:opacity-70"
          >
            {t("backToDetails")}
          </button>
          <h2 className="mt-3 text-lg font-bold uppercase tracking-tight text-foreground lg:mt-3.5 lg:text-xl">
            {panel === "change-email" ? t("changeEmailHeading") : t("changePasswordHeading")}
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground lg:mt-2">
            {panel === "change-email"
              ? t("changeEmailIntro", { email: email ?? "—" })
              : t("changePasswordIntro")}
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
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-6 md:flex-row md:gap-12 md:py-12 lg:gap-24">
          {/* Sidebar — hidden on email/password fullscreen */}
          <aside className="w-full shrink-0 md:w-[200px] lg:w-[240px]">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
              {vaultTitle}
            </h1>
            <nav className="mt-6 flex flex-row flex-wrap gap-x-6 gap-y-2 md:mt-12 md:flex-col md:gap-8">
              <button type="button" className={navBtn(panel === "purchases")} onClick={() => setPanel("purchases")}>
                {t("navPurchases")}
              </button>
              <button type="button" className={navBtn(panel === "details")} onClick={() => setPanel("details")}>
                {t("navDetails")}
              </button>
              <SignOutButton signOutOptions={{ redirectUrl: `/${locale}` }}>
                <button
                  type="button"
                  className="text-start text-sm font-semibold uppercase tracking-[0.2em] text-foreground hover:opacity-70"
                >
                  {t("logOut")}
                </button>
              </SignOutButton>
            </nav>
          </aside>

          <main className="min-w-0 w-full flex-1 pb-8 md:pb-0">
          {panel === "purchases" && (
            <div>
              {orders.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                  <p className="max-w-md text-sm font-semibold uppercase tracking-[0.15em] text-foreground">
                    {t("purchasesEmpty")}
                  </p>
                  <Link
                    href="/streetwear/shop"
                    className="mt-8 bg-primary px-10 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:opacity-90"
                  >
                    {t("shopNow")}
                  </Link>
                </div>
              ) : (
                <div className="space-y-10">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                      {t("orderHistory")}
                    </h2>
                    <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                      {t("orderHistoryHint")}
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
                          <div className="group flex w-full min-w-0 flex-wrap items-start gap-x-3 gap-y-3 px-4 py-4 transition-colors hover:bg-muted/40 md:flex-nowrap md:items-center md:gap-4 md:px-5 md:py-5">
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
                              aria-label={
                                expanded
                                  ? t("collapseOrder", {
                                      id: orderNumberOrFallback(order.orderNumber, order.id),
                                    })
                                  : t("expandOrder", {
                                      id: orderNumberOrFallback(order.orderNumber, order.id),
                                    })
                              }
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
                                  {t("placedOn")}{" "}
                                  <time dateTime={order.createdAt}>{placedLabel}</time>
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
                                <div className="text-end">
                                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                                    {t("total")}
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
                                      {t("items")}
                                    </h3>
                                    <ul className="mt-4 space-y-4">
                                      {items.length === 0 ? (
                                        <li className="text-sm text-muted-foreground">
                                          {t("noLineItems")}
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
                                                  {t("size")} {item.size}
                                                </p>
                                                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                  <span>{t("qty", { count: item.quantity })}</span>
                                                  <span className="tabular-nums">
                                                    {t("each", {
                                                      price: `$${formatUsd(item.priceAtPurchase)}`,
                                                    })}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="shrink-0 text-end">
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
                                        {t("shippingAddress")}
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

                                    <div className="w-full max-w-xs space-y-2 sm:text-end">
                                      <h3 className="text-start text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-end">
                                        {t("summary")}
                                      </h3>
                                      <div className="space-y-1.5 text-sm">
                                        <div className="flex justify-between gap-4 tabular-nums">
                                          <span className="text-muted-foreground">{t("subtotal")}</span>
                                          <span>${formatUsd(order.subtotalAmount)}</span>
                                        </div>
                                        {discountNum > 0 && (
                                          <div className="flex justify-between gap-4 tabular-nums text-emerald-700 dark:text-emerald-400">
                                            <span>{t("discount")}</span>
                                            <span>−${formatUsd(order.discountAmount)}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between gap-4 tabular-nums">
                                          <span className="text-muted-foreground">{t("shipping")}</span>
                                          <span>
                                            {shippingNum <= 0
                                              ? t("shippingFree")
                                              : `$${formatUsd(order.shippingFee)}`}
                                          </span>
                                        </div>
                                        <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold tabular-nums">
                                          <span>{t("total")}</span>
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
                                        window.alert(t("trackingUnavailable"));
                                      }}
                                      className="border border-border bg-background px-4 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-muted"
                                    >
                                      {t("trackOrder")}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.alert(t("supportEmailHint"));
                                      }}
                                      className="border border-transparent px-4 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                    >
                                      {t("contactSupport")}
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
            <div className="max-w-2xl space-y-10 md:space-y-14">
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                  {t("detailsHeading")}
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="acct-first">
                      {t("labelName")}
                    </label>
                    <input
                      id="acct-first"
                      className={inputClass}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t("phName")}
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="acct-last">
                      {t("labelSurname")}
                    </label>
                    <input
                      id="acct-last"
                      className={inputClass}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t("phSurname")}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <label className={labelClass}>{t("labelTelephone")}</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      className={cn(inputClass, "w-full shrink-0 cursor-pointer sm:w-[100px]")}
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      aria-label={t("countryCodeAria")}
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
                      placeholder={t("phTelephone")}
                      autoComplete="tel-national"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                  {t("billingHeading")}
                </h2>
                <div className="mt-8 space-y-6">
                  <div>
                    <label className={labelClass} htmlFor="acct-street">
                      {t("labelStreet")}
                    </label>
                    <input
                      id="acct-street"
                      className={inputClass}
                      value={billingStreet}
                      onChange={(e) => setBillingStreet(e.target.value)}
                      placeholder={t("phStreet")}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="acct-stair">
                      {t("labelStairway")}
                    </label>
                    <div className="relative">
                      <input
                        id="acct-stair"
                        className={inputClass}
                        value={billingStairway}
                        maxLength={15}
                        onChange={(e) => setBillingStairway(e.target.value)}
                        placeholder={t("phStairway")}
                      />
                      <span className="pointer-events-none absolute bottom-2 end-3 text-[0.65rem] text-muted-foreground">
                        {billingStairway.length}/15
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="acct-district">
                        {t("labelDistrict")}
                      </label>
                      <select
                        id="acct-district"
                        className={cn(inputClass, "cursor-pointer")}
                        value={billingDistrict}
                        onChange={(e) => setBillingDistrict(e.target.value)}
                      >
                        <option value="">{t("selectDistrict")}</option>
                        <option value="Beirut">{t("districtBeirut")}</option>
                        <option value="Mount Lebanon">{t("districtMountLebanon")}</option>
                        <option value="North">{t("districtNorth")}</option>
                        <option value="South">{t("districtSouth")}</option>
                        <option value="Nabatieh">{t("districtNabatieh")}</option>
                        <option value="Bekaa">{t("districtBekaa")}</option>
                        <option value="Other">{t("districtOther")}</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="acct-locality">
                        {t("labelLocality")}
                      </label>
                      <select
                        id="acct-locality"
                        className={cn(inputClass, "cursor-pointer")}
                        value={billingLocality}
                        onChange={(e) => setBillingLocality(e.target.value)}
                      >
                        <option value="">{t("selectLocality")}</option>
                        <option value="Beirut">{t("localityBeirut")}</option>
                        <option value="Tripoli">{t("localityTripoli")}</option>
                        <option value="Sidon">{t("localitySidon")}</option>
                        <option value="Tyre">{t("localityTyre")}</option>
                        <option value="Zahle">{t("localityZahle")}</option>
                        <option value="Jounieh">{t("localityJounieh")}</option>
                        <option value="Other">{t("localityOther")}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
                  {t("accountInfoHeading")}
                </h2>
                <ul className="mt-6 divide-y divide-border border-t border-border">
                  <li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-4">
                    <Mail className="h-5 w-5 shrink-0 text-foreground" strokeWidth={1.25} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm uppercase tracking-wide text-foreground">
                      {email ?? "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPanel("change-email")}
                      className="w-full shrink-0 text-start text-xs font-semibold uppercase tracking-widest underline underline-offset-4 hover:opacity-70 sm:w-auto sm:text-end"
                    >
                      {t("change")}
                    </button>
                  </li>
                  <li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-4">
                    <Lock className="h-5 w-5 shrink-0 text-foreground" strokeWidth={1.25} aria-hidden />
                    <span className="flex-1 text-sm font-semibold uppercase tracking-wide text-foreground">
                      {t("password")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPanel("change-password")}
                      className="w-full shrink-0 text-start text-xs font-semibold uppercase tracking-widest underline underline-offset-4 hover:opacity-70 sm:w-auto sm:text-end"
                    >
                      {t("change")}
                    </button>
                  </li>
                  <li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-4">
                    <Trash2 className="h-5 w-5 shrink-0 text-destructive" strokeWidth={1.25} aria-hidden />
                    <DeleteAccountButton variant="link" label={t("deleteAccount")} className="text-destructive" />
                  </li>
                </ul>
              </section>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-14"
              >
                {isSaving ? t("saving") : t("save")}
              </button>
            </div>
          )}

          </main>
        </div>
      )}
    </div>
  );
}
