import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { WishlistSyncProvider } from "@/components/WishlistSyncProvider";
import { Navbar } from "@/components/Navbar";
import { GateHandoffLayer } from "@/components/storefront/GateHandoffLayer";
import { LandingAwareSiteFooter } from "@/components/storefront/LandingAwareSiteFooter";
import { ShopListingNavProvider } from "@/components/storefront/ShopListingNavContext";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { MetaPixelRouteTracker } from "@/components/analytics/MetaPixelRouteTracker";
import { configuredMetaPixelIds } from "@/lib/analytics/meta-pixels";

/** Middleware sets `x-nonce`; Next may expose it as `x-middleware-request-x-nonce` to `headers()`. */
function resolveCspNonce(headersList: Headers): string | undefined {
  const direct =
    headersList.get("x-nonce")?.trim() ||
    headersList.get("x-middleware-request-x-nonce")?.trim();
  if (direct) return direct;
  const csp =
    headersList.get("x-middleware-request-content-security-policy")?.trim() ||
    headersList.get("content-security-policy")?.trim();
  if (!csp) return undefined;
  const m = csp.match(/'nonce-([^']+)'/);
  return m?.[1]?.trim();
}

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tLayout = await getTranslations("Layout");
  const headersList = await headers();
  const nonce = resolveCspNonce(headersList);
  const metaPixelIds = configuredMetaPixelIds();

  return (
    <WishlistProvider>
      <WishlistSyncProvider />
      <CurrencyProvider>
        <CartProvider>
          <ShopListingNavProvider>
            <GateHandoffLayer>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-background focus:text-foreground"
              >
                {tLayout("skipToContent")}
              </a>
              <Navbar />
              <div id="main-content">{children}</div>
              <LandingAwareSiteFooter />
            </GateHandoffLayer>
            {metaPixelIds.length > 0 ? (
              <>
                <MetaPixel pixelIds={metaPixelIds} nonce={nonce} />
                <Suspense fallback={null}>
                  <MetaPixelRouteTracker />
                </Suspense>
              </>
            ) : null}
          </ShopListingNavProvider>
        </CartProvider>
      </CurrencyProvider>
    </WishlistProvider>
  );
}
