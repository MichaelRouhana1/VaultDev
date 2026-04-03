import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { headers } from "next/headers";
import { mosaikClerkAppearance } from "@/lib/clerk-auth-appearance";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { WishlistSyncProvider } from "@/components/WishlistSyncProvider";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { isMosaikLocale } from "@/lib/i18n-locales";
import { routing } from "@/lib/i18n-routing";
import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/storefront/SiteFooter";
import { ShopListingNavProvider } from "@/components/storefront/ShopListingNavContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VAULT",
  description: "Clothing designed with intention.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isMosaikLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages();
  const tLayout = await getTranslations("Layout");
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || undefined;
  /** Storefront stays LTR for every locale; Arabic only swaps strings, not layout/mirroring. */
  return (
    <html lang={locale} dir="ltr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ClerkProvider
            dynamic
            nonce={nonce}
            appearance={mosaikClerkAppearance}
            signInFallbackRedirectUrl={`/${locale}/account`}
            signUpFallbackRedirectUrl={`/${locale}/account`}
          >
            <ThemeProvider>
              <WishlistProvider>
                <WishlistSyncProvider />
                <CurrencyProvider>
                  <CartProvider>
                    <ShopListingNavProvider>
                      <a
                        href="#main-content"
                        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-background focus:text-foreground"
                      >
                        {tLayout("skipToContent")}
                      </a>
                      <Navbar />
                      <div id="main-content">{children}</div>
                      <SiteFooter />
                      <Toaster richColors position="top-right" />
                    </ShopListingNavProvider>
                  </CartProvider>
                </CurrencyProvider>
              </WishlistProvider>
            </ThemeProvider>
          </ClerkProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
