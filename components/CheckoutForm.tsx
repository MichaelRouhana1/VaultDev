"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { placeOrder, type CartItem } from "@/actions/placeOrder";
import { validatePromoCode } from "@/actions/promo";
import { useAuth } from "@clerk/nextjs";
import { useCart } from "@/context/CartContext";
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

interface CheckoutFormProps {
  cart: CartItem[];
}

function placeOrderAction(
  _prevState: { error?: string; orderId?: number; activationToken?: string } | null,
  formData: FormData,
): Promise<{ error?: string; orderId?: number; activationToken?: string }> {
  const itemsJson = formData.get("items") as string;
  if (!itemsJson) {
    return Promise.resolve({ error: "Cart is empty" });
  }
  const items = JSON.parse(itemsJson) as CartItem[];
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
  })
    .then((res) => {
      if (res.success === false && res.error) {
        return { error: res.error };
      }
      if (!res.orderId) {
        return { error: "Order failed" };
      }
      return { orderId: res.orderId, activationToken: res.activationToken };
    })
    .catch((err) => ({ error: err instanceof Error ? err.message : "Order failed" }));
}

export function CheckoutForm({ cart }: CheckoutFormProps) {
  const router = useRouter();
  const { userId: clerkUserId } = useAuth();
  const { clearOrderedItems } = useCart();
  const [state, formAction, isPending] = useActionState(placeOrderAction, null);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    if (state?.orderId) {
      clearOrderedItems(
        cart.map((i) => ({
          productId: i.productId,
          size: i.size,
          quantity: i.quantity,
        })),
      );
      const q = new URLSearchParams({ orderId: String(state.orderId) });
      if (state.activationToken) {
        q.set("key", state.activationToken);
      }
      router.push(`/checkout/success?${q.toString()}`);
    }
  }, [state?.orderId, state?.activationToken, cart, clearOrderedItems, router]);

  if (state?.orderId) {
    return null;
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * parseFloat(item.priceAtPurchase),
    0
  );
  const discountAmount = appliedPromo?.discountAmount ?? 0;
  const shippingFee = DEFAULT_SHIPPING_FEE;
  const total = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleApplyPromo = async () => {
    const code = promoInput?.trim().toUpperCase();
    if (!code) {
      toast.error("Please enter a promo code");
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
      toast.success(`Promo code ${result.code} applied! -$${result.discountAmount.toFixed(2)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
  };

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="items" value={JSON.stringify(cart)} />
      <input type="hidden" name="promoCode" value={appliedPromo?.code ?? ""} />
      {clerkUserId ? <input type="hidden" name="clerkUserId" value={clerkUserId} /> : null}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact & payment</CardTitle>
            <CardDescription>
              Enter your details for order confirmation. Payment is{" "}
              <span className="font-medium text-foreground">cash on delivery only</span>—pay when your
              order arrives.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Full name</Label>
              <Input
                id="customerName"
                name="customerName"
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestEmail">Email</Label>
              <Input
                id="guestEmail"
                name="guestEmail"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="+1 234 567 8900"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address</Label>
              <Input
                id="addressLine1"
                name="addressLine1"
                placeholder="123 Main St, Apt 4"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                placeholder="New York"
                required
              />
            </div>
            <div className="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-3 text-sm">
              <p className="font-medium text-foreground">Payment</p>
              <p className="text-muted-foreground">
                Cash on Delivery (COD) — the only method we offer. You&apos;ll pay the courier when you
                receive your package.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
            <CardDescription>{cart.length} item(s) in your cart</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {cart.map((item, i) => (
                <li
                  key={i}
                  className="flex justify-between text-sm"
                >
                  <span>
                    Product #{item.productId} · {item.size} × {item.quantity}
                  </span>
                  <span>
                    $
                    {(
                      item.quantity * parseFloat(item.priceAtPurchase)
                    ).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label htmlFor="promoCode" className="text-muted-foreground">Promo code</Label>
              {appliedPromo ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {appliedPromo.code} applied (−${appliedPromo.discountAmount.toFixed(2)})
                  </span>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="promoCode"
                    placeholder="Enter code"
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
                    {promoLoading ? "Applying…" : "Apply"}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discount ({appliedPromo?.code})</span>
                  <span>−${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>${shippingFee.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2">
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" disabled={isPending || cart.length === 0}>
              {isPending ? "Placing order…" : "Place order"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}
