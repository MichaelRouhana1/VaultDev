import type { Metadata } from "next";
import { headers } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { mosaikClerkAppearance } from "@/lib/clerk-auth-appearance";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { WishlistSyncProvider } from "@/components/WishlistSyncProvider";
import { Navbar } from "@/components/Navbar";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || undefined;

  return (
    <ClerkProvider
      dynamic
      nonce={nonce}
      appearance={mosaikClerkAppearance}
      signInFallbackRedirectUrl="/account"
      signUpFallbackRedirectUrl="/account"
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider>
            <WishlistProvider>
              <WishlistSyncProvider />
              <CartProvider>
                <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-background focus:text-foreground">
                  Skip to content
                </a>
                <Navbar />
                <div id="main-content">
                  {children}
                </div>
                <Toaster richColors position="top-right" />
              </CartProvider>
            </WishlistProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
