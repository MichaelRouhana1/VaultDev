import { CheckoutForm } from "@/components/CheckoutForm";
import { enrichCheckoutCartItems } from "@/actions/checkout-enrich";
import { parseCheckoutCartPayload } from "@/lib/checkout-cart";

interface CheckoutPageProps {
  searchParams: Promise<{ cart?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;

  let raw: unknown = [];
  try {
    raw = params.cart ? JSON.parse(decodeURIComponent(params.cart)) : [];
  } catch {
    raw = [];
  }

  let lines = parseCheckoutCartPayload(raw);

  // Demo cart when empty - replace with real cart from session/cookie in production
  if (lines.length === 0) {
    lines = [
      { productId: 1, size: "M", quantity: 1, priceAtPurchase: "29.99" },
      { productId: 2, size: "L", quantity: 2, priceAtPurchase: "49.99" },
    ];
  }

  const displayItems = await enrichCheckoutCartItems(lines);

  return (
    <div className="pt-14">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold">Checkout</h1>
        <CheckoutForm displayItems={displayItems} />
      </div>
    </div>
  );
}
