"use client";

import { useEffect, useState, useMemo } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { placeOrder, type CartItem } from "@/actions/placeOrder";
import {
  toPlaceOrderCartItems,
  type CheckoutDisplayItem,
} from "@/lib/checkout-cart";
import type { CartItemDisplay } from "@/context/CartContext";
import { validatePromoCode } from "@/actions/promo";
import { useAuth, useUser } from "@clerk/nextjs";
import { parseVaultProfile } from "@/lib/account-vault-profile";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const DEFAULT_SHIPPING_FEE = 5;

const CHECKOUT_ERROR_KEYS: Record<string, "errorBagEmpty" | "errorInvalidBag" | "errorOrderFailed" | "errorRateLimit"> = {
  "Your bag is empty": "errorBagEmpty",
  "Invalid bag data": "errorInvalidBag",
  "Order failed": "errorOrderFailed",
  "Too many requests. Please wait before trying again.": "errorRateLimit",
};

function translateCheckoutError(
  msg: string | undefined,
  t: (key: string) => string,
): string | undefined {
  if (!msg) return undefined;
  const key = CHECKOUT_ERROR_KEYS[msg];
  return key ? t(key) : msg;
}

function cartItemsToDisplay(items: CartItemDisplay[]): CheckoutDisplayItem[] {
  return items.map((i) => ({
    productId: i.productId,
    size: i.size,
    quantity: i.quantity,
    priceAtPurchase: i.priceAtPurchase,
    productName: i.productName?.trim() || "Unknown item",
    productImageUrl: i.productImage?.trim() ? i.productImage.trim() : null,
    productColor: i.productColor?.trim() ? i.productColor.trim() : null,
  }));
}

function placeOrderAction(
  _prevState: { error?: string; orderId?: number } | null,
  formData: FormData,
): Promise<{ error?: string; orderId?: number }> {
  const itemsJson = formData.get("items") as string;
  if (!itemsJson) {
    return Promise.resolve({ error: "Your bag is empty" });
  }
  let items: CartItem[];
  try {
    items = JSON.parse(itemsJson) as CartItem[];
  } catch {
    return Promise.resolve({ error: "Invalid bag data" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return Promise.resolve({ error: "Your bag is empty" });
  }
  const promoCode = (formData.get("promoCode") as string)?.trim() || undefined;
  const clerkUserId = (formData.get("clerkUserId") as string)?.trim() || undefined;
  return placeOrder({
    userId: clerkUserId || undefined,
    guestEmail: (formData.get("guestEmail") as string) || null,
    paymentMethod: "COD",
    customerName: formData.get("customerName") as string,
    phoneNumber: formData.get("phoneNumber") as string,
    addressLine1: formData.get("addressLine1") as string,
    city: formData.get("city") as string,
    items,
    promoCode,
    saveAsDefaultAddress: formData.get("saveAsDefaultAddress") === "on",
  })
    .then((res) => {
      if ("success" in res && res.success === false) {
        return { error: res.error };
      }
      if (!("orderId" in res) || !res.orderId) {
        return { error: "Order failed" };
      }
      return { orderId: res.orderId };
    })
    .catch((err) => ({ error: err instanceof Error ? err.message : "Order failed" }));
}

export function CheckoutForm() {
  const router = useRouter();
  const t = useTranslations("CheckoutForm");
  const tCommon = useTranslations("Common");
  const { userId: clerkUserId } = useAuth();
  const { user: clerkUser, isLoaded: clerkUserLoaded } = useUser();
  const { items, cartHydrated, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const displayItems = useMemo(() => cartItemsToDisplay(items), [items]);
  const cartForOrder = useMemo(() => toPlaceOrderCartItems(displayItems), [displayItems]);
  const [state, formAction, isPending] = useActionState(placeOrderAction, null);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");

  /** Map Clerk profile + saved VAULT account billing (publicMetadata.vaultProfile) into checkout fields. */
  useEffect(() => {
    if (!clerkUserLoaded || !clerkUser) return;
    const meta = clerkUser.publicMetadata as { vaultProfile?: unknown };
    const vp = parseVaultProfile(meta.vaultProfile);
    const fullName =
      [clerkUser.firstName, clerkUser.lastName]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(" ")
        .trim() ||
      clerkUser.fullName?.trim() ||
      "";
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? "";
    const phoneFromVault = [vp.phoneCountryCode?.trim(), vp.phoneNumber?.trim()]
      .filter(Boolean)
      .join(" ")
      .trim();
    const phone =
      phoneFromVault || clerkUser.primaryPhoneNumber?.phoneNumber?.trim() || "";
    const b = vp.billing ?? {};
    const line1 = [b.street?.trim(), b.stairway?.trim()].filter(Boolean).join(", ");
    const d = b.district?.trim() ?? "";
    const loc = b.locality?.trim() ?? "";
    const cityStr = d && loc && d !== loc ? `${d}, ${loc}` : loc || d;

    setCustomerName((v) => v || fullName);
    setGuestEmail((v) => v || email);
    setPhoneNumber((v) => v || phone);
    setAddressLine1((v) => v || line1);
    setCity((v) => v || cityStr);
  }, [clerkUserLoaded, clerkUser]);

  useEffect(() => {
    if (state?.orderId) {
      clearCart();
      router.push("/checkout/success");
    }
  }, [state?.orderId, clearCart, router]);

  useEffect(() => {
    if (!cartHydrated || state?.orderId) return;
    if (items.length === 0) {
      router.replace("/bag");
    }
  }, [cartHydrated, items.length, state?.orderId, router]);

  if (state?.orderId) {
    return null;
  }

  if (!cartHydrated) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-hidden />
        <span className="sr-only">{t("loadingBag")}</span>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const subtotal = displayItems.reduce(
    (sum, item) => sum + item.quantity * parseFloat(item.priceAtPurchase),
    0,
  );
  const discountAmount = appliedPromo?.discountAmount ?? 0;
  const shippingFee = DEFAULT_SHIPPING_FEE;
  const total = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleApplyPromo = async () => {
    const code = promoInput?.trim().toUpperCase();
    if (!code) {
      toast.error(t("toastEnterPromo"));
      return;
    }
    setPromoLoading(true);
    try {
      const result = await validatePromoCode(code, subtotal, shippingFee);
      if (!result.success) {
        throw new Error(result.error);
      }
      setAppliedPromo({ code: result.code, discountAmount: result.discountAmount });
      setPromoInput("");
      toast.success(
        t("toastPromoApplied", {
          code: result.code,
          amount: formatPrice(result.discountAmount),
        }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastInvalidPromo"));
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
  };

  const handleClearAddress = () => {
    setPhoneNumber("");
    setAddressLine1("");
    setCity("");
  };

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="items" value={JSON.stringify(cartForOrder)} />
      <input type="hidden" name="promoCode" value={appliedPromo?.code ?? ""} />
      {clerkUserId ? <input type="hidden" name="clerkUserId" value={clerkUserId} /> : null}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("contactTitle")}</CardTitle>
            <CardDescription>
              {t("contactDescriptionBefore")}{" "}
              <span className="font-medium text-foreground">{t("codBold")}</span>
              {t("contactDescriptionAfter")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">{t("labelFullName")}</Label>
              <Input
                id="customerName"
                name="customerName"
                placeholder={t("phFullName")}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestEmail">{t("labelEmail")}</Label>
              <Input
                id="guestEmail"
                name="guestEmail"
                type="email"
                placeholder={t("phEmail")}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-4 rounded-md border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("deliveryAddressSection")}
                </p>
                <button
                  type="button"
                  onClick={handleClearAddress}
                  className="shrink-0 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {t("clearAddress")}
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">{t("labelPhone")}</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder={t("phPhone")}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  autoComplete="tel"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine1">{t("labelAddress")}</Label>
                <Input
                  id="addressLine1"
                  name="addressLine1"
                  placeholder={t("phAddress")}
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  autoComplete="street-address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t("labelCity")}</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder={t("phCity")}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoComplete="address-level2"
                  required
                />
              </div>
            </div>
            {clerkUserId ? (
              <div className="flex items-start gap-2">
                <input
                  id="saveAsDefaultAddress"
                  name="saveAsDefaultAddress"
                  type="checkbox"
                  value="on"
                  className="mt-1 size-4 shrink-0 rounded border-border accent-foreground"
                />
                <Label htmlFor="saveAsDefaultAddress" className="cursor-pointer font-normal leading-snug">
                  {t("saveAsDefaultAddress")}
                </Label>
              </div>
            ) : null}
            <div className="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-3 text-sm">
              <p className="font-medium text-foreground">{t("paymentTitle")}</p>
              <p className="text-muted-foreground">{t("paymentCod")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("summaryTitle")}</CardTitle>
            <CardDescription>{t("summaryItems", { count: displayItems.length })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-4">
              {displayItems.map((item, i) => {
                const lineTotal = item.quantity * parseFloat(item.priceAtPurchase);
                const variantParts = [
                  t("sizeLabel", { size: item.size }),
                  item.productColor ? t("colorLabel", { color: item.productColor }) : null,
                ].filter(Boolean);
                const src = item.productImageUrl?.trim();
                return (
                  <li
                    key={`${item.productId}-${item.size}-${i}`}
                    className="flex gap-3 border-b border-border/80 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                      {src ? (
                        <Image
                          src={src}
                          alt={item.productName}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[0.65rem] text-muted-foreground">
                          —
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-foreground">
                        {item.productName || t("unknownItem")}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {variantParts.join(" | ")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("lineQty", { count: item.quantity })}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatPrice(lineTotal)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="space-y-2 border-t border-border pt-2">
              <Label htmlFor="promoCode" className="text-muted-foreground">
                {t("promoLabel")}
              </Label>
              {appliedPromo ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {t("promoApplied", {
                      code: appliedPromo.code,
                      amount: formatPrice(appliedPromo.discountAmount),
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-xs text-destructive hover:underline"
                  >
                    {tCommon("remove")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="promoCode"
                    placeholder={t("promoPlaceholder")}
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    className="uppercase"
                    disabled={promoLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                  >
                    {promoLoading ? t("applying") : t("apply")}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-border pt-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("subtotal")}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>{t("discountLine", { code: appliedPromo?.code ?? "" })}</span>
                  <span>−{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>{t("shipping")}</span>
                <span>{formatPrice(shippingFee)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2">
            <div className="flex justify-between text-base font-semibold">
              <span>{t("total")}</span>
              <span>{formatPrice(total)}</span>
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{translateCheckoutError(state.error, t)}</p>
            )}
            <Button type="submit" disabled={isPending || displayItems.length === 0}>
              {isPending ? t("placing") : t("placeOrder")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}
