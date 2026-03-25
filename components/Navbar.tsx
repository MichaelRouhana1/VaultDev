"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useCart } from "@/context/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { ShopDrawer } from "@/components/ShopDrawer";
import { getCategories, getStoreCategories } from "@/actions/categories";
import {
  mosaikClerkUserButtonPopoverElementsDark,
  mosaikClerkUserButtonPopoverElementsLight,
  mosaikClerkUserButtonVariablesDark,
  mosaikClerkUserButtonVariablesLight,
} from "@/lib/clerk-auth-appearance";
import type { ProductCategory } from "@/actions/categories";

export function Navbar() {
  const pathname = usePathname();
  const { sessionClaims } = useAuth();
  const { totalItems, setOpenCart } = useCart();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [userButtonThemeReady, setUserButtonThemeReady] = useState(false);

  useEffect(() => {
    setUserButtonThemeReady(true);
  }, []);

  const userButtonAppearance = useMemo(() => {
    const isDark = userButtonThemeReady && resolvedTheme === "dark";
    const popover = isDark ? mosaikClerkUserButtonPopoverElementsDark : mosaikClerkUserButtonPopoverElementsLight;
    const variables = isDark ? mosaikClerkUserButtonVariablesDark : mosaikClerkUserButtonVariablesLight;
    return {
      variables,
      elements: {
        avatarBox: "w-5 h-5",
        ...popover,
      },
    };
  }, [userButtonThemeReady, resolvedTheme]);
  const [cartOpen, setCartOpen] = useState(false);
  const [shopDrawerOpen, setShopDrawerOpen] = useState(false);
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    setOpenCart(() => () => setCartOpen(true));
  }, [setOpenCart]);

  useEffect(() => {
    const storeType = pathname?.split('/')[1];
    if (storeType === "streetwear" || storeType === "formal") {
      getStoreCategories(storeType).then(setCategories);
    } else {
      getCategories().then(setCategories);
    }
  }, [pathname]);

  const storeType = pathname?.split('/')[1];
  const isStoreType = storeType === "streetwear" || storeType === "formal";

  const isAdmin = (sessionClaims?.metadata as { role?: string })?.role === "admin";

  if (pathname?.startsWith("/admin")) return null;
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) return null;
  if (pathname === "/") return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-14">
          {/* Left: Burger + Primary navigation */}
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 shrink-0">
            {/* Burger menu button - visible on smaller screens */}
            <button
              type="button"
              onClick={() => setBurgerOpen((o) => !o)}
              className="lg:hidden p-2 text-foreground hover:opacity-70 transition-opacity"
              aria-label={burgerOpen ? "Close menu" : "Open menu"}
              aria-expanded={burgerOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {burgerOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-normal text-foreground hover:opacity-70 transition-opacity hidden sm:inline"
              >
                Dashboard
              </Link>
            )}
            {/* Shop - opens drawer like Cart */}
            <button
              type="button"
              onClick={() => setShopDrawerOpen(true)}
              className="hidden lg:inline text-sm font-normal text-foreground hover:opacity-70 transition-opacity"
              aria-label="Open shop menu"
            >
              Shop
            </button>
          </div>

          {/* Center: Logo */}
          <Link
            href={isStoreType ? `/${storeType}` : "/"}
            className="absolute left-1/2 -translate-x-1/2 text-xl font-light text-foreground tracking-[0.25em] uppercase hover:opacity-70 transition-opacity shrink-0"
          >
            VAULT
          </Link>

          {/* Right: icons always visible, text links desktop only */}
          <div className="flex items-center gap-3 lg:gap-6 shrink-0">
            {/* Desktop-only text links */}
            <Link
              href={isStoreType ? `/${storeType}/shop` : "/shop"}
              className="hidden lg:inline text-sm font-normal text-foreground hover:opacity-70 transition-opacity"
            >
              Search
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="hidden lg:inline-flex p-2 text-foreground hover:opacity-70 transition-opacity"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/account"
                className="text-sm font-normal text-foreground hover:opacity-70 transition-opacity"
              >
                Account
              </Link>
              <UserButton
                afterSignOutUrl="/"
                userProfileUrl="/account"
                userProfileMode="navigation"
                appearance={userButtonAppearance}
              />
            </div>
            {/* Account icon - mobile/tablet only */}
            <Link
              href="/account"
              className="lg:hidden p-2 text-foreground hover:opacity-70 transition-opacity"
              aria-label="View account profile"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </Link>
            {/* Cart button - always visible */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity"
              aria-label="View shopping cart"
            >
              <span className="hidden lg:inline text-sm font-normal">Cart</span>
              <span className="relative">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-medium">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Burger menu overlay */}
      {burgerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 top-14 bg-black/20 z-40"
            onClick={() => setBurgerOpen(false)}
            aria-hidden
          />
          <div
            className="lg:hidden absolute top-full left-0 right-0 z-50 bg-background border-b border-border shadow-lg max-h-[85vh] overflow-y-auto"
            role="menu"
          >
            <div className="py-4 px-4 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setShopDrawerOpen(true);
                  setBurgerOpen(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 text-left"
                role="menuitem"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Shop
              </button>
              <div className="border-t border-border my-3" />
              <Link
                href={isStoreType ? `/${storeType}/shop` : "/shop"}
                onClick={() => setBurgerOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50"
                role="menuitem"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Search
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 text-left"
                role="menuitem"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <Link
                href="/account"
                onClick={() => setBurgerOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50"
                role="menuitem"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Account
              </Link>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(true);
                  setBurgerOpen(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 text-left"
                role="menuitem"
                aria-label="View shopping cart"
              >
                <span className="relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-medium">
                      {totalItems > 99 ? "99+" : totalItems}
                    </span>
                  )}
                </span>
                Cart {totalItems > 0 && `(${totalItems})`}
              </button>
            </div>
          </div>
        </>
      )}

      <ShopDrawer
        isOpen={shopDrawerOpen}
        onClose={() => setShopDrawerOpen(false)}
        categories={categories}
      />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </nav>
  );
}
