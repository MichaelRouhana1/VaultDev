"use client";

import { useState, useEffect, useMemo, type MouseEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { UserButton, useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useCart } from "@/context/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { ShopDrawer } from "@/components/ShopDrawer";
import { getStoreCategories } from "@/actions/categories";
import {
  mosaikClerkUserButtonPopoverElementsDark,
  mosaikClerkUserButtonPopoverElementsLight,
  mosaikClerkUserButtonVariablesDark,
  mosaikClerkUserButtonVariablesLight,
} from "@/lib/clerk-auth-appearance";
import type { ProductCategory } from "@/actions/categories";
import type { StoreTypeSlug } from "@/lib/preferred-store";
import { isInStoreSection } from "@/lib/store-nav";
import { cn } from "@/lib/utils";

function activeStoreFromRoute(
  paramsStore: string | string[] | undefined,
  pathname: string | null,
): StoreTypeSlug | null {
  const raw = Array.isArray(paramsStore) ? paramsStore[0] : paramsStore;
  if (raw === "streetwear" || raw === "formal") return raw;
  const seg = pathname?.split("/").filter(Boolean)[0];
  if (seg === "streetwear" || seg === "formal") return seg;
  return null;
}

export function Navbar() {
  const t = useTranslations("Navbar");
  const tCommon = useTranslations("Common");
  const pathname = usePathname();
  const locale = useLocale();
  const params = useParams<{ storeType?: string }>();
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
  const [shopDrawerStore, setShopDrawerStore] = useState<StoreTypeSlug | null>(null);
  const [drawerCategories, setDrawerCategories] = useState<ProductCategory[]>([]);
  const [burgerOpen, setBurgerOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    setOpenCart(() => setCartOpen(true));
  }, [setOpenCart]);

  useEffect(() => {
    if (!shopDrawerOpen || !shopDrawerStore) return;
    void getStoreCategories(shopDrawerStore).then(setDrawerCategories);
  }, [shopDrawerOpen, shopDrawerStore]);

  const openShopDrawer = (store: StoreTypeSlug) => {
    setShopDrawerStore(store);
    setShopDrawerOpen(true);
  };

  const closeShopDrawer = () => {
    setShopDrawerOpen(false);
  };

  const handleStreetwearHeaderClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (isInStoreSection(pathname, "streetwear")) {
      e.preventDefault();
    }
    openShopDrawer("streetwear");
  };

  const handleFormalHeaderClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (isInStoreSection(pathname, "formal")) {
      e.preventDefault();
    }
    openShopDrawer("formal");
  };

  const storeType = pathname?.split("/").filter(Boolean)[0];
  const isStoreType = storeType === "streetwear" || storeType === "formal";
  const activeStore = activeStoreFromRoute(params.storeType, pathname);

  const isAdmin = (sessionClaims?.metadata as { role?: string })?.role === "admin";

  if (pathname?.startsWith("/admin")) return null;
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) return null;
  if (pathname === "/") return null;

  const streetwearHref = "/streetwear";
  const formalHref = "/formal";
  const vaultHref =
    activeStore === "streetwear" ? "/streetwear" : activeStore === "formal" ? "/formal" : "/";

  const storeLinkClass = (slug: StoreTypeSlug) =>
    cn(
      "text-[10px] sm:text-xs tracking-[0.22em] uppercase transition-colors",
      activeStore === slug
        ? "font-semibold text-foreground underline decoration-1 underline-offset-4"
        : "font-normal text-foreground/45 hover:text-foreground/80",
    );

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-14">
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => setBurgerOpen((o) => !o)}
              className="lg:hidden p-2 text-foreground hover:opacity-70 transition-opacity"
              aria-label={burgerOpen ? t("closeMenu") : t("openMenu")}
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
                {t("dashboard")}
              </Link>
            )}
            <div
              className="hidden lg:flex items-center gap-2 sm:gap-3 shrink-0"
              role="navigation"
              aria-label={t("storeSelectionAria")}
            >
              <Link
                href={streetwearHref}
                onClick={handleStreetwearHeaderClick}
                className={storeLinkClass("streetwear")}
              >
                {t("streetwear")}
              </Link>
              <span className="text-foreground/25 text-[10px] select-none" aria-hidden>
                |
              </span>
              <Link href={formalHref} onClick={handleFormalHeaderClick} className={storeLinkClass("formal")}>
                {t("formal")}
              </Link>
            </div>
          </div>

          <Link
            href={vaultHref}
            className="absolute start-1/2 -translate-x-1/2 text-xl font-light text-foreground tracking-[0.25em] uppercase hover:opacity-70 transition-opacity shrink-0"
          >
            {tCommon("brand")}
          </Link>

          <div className="flex items-center gap-3 lg:gap-6 shrink-0">
            <Link
              href={isStoreType ? `/${storeType}/shop` : "/shop"}
              className="hidden lg:inline text-sm font-normal text-foreground hover:opacity-70 transition-opacity"
            >
              {t("search")}
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="hidden lg:inline-flex p-2 text-foreground hover:opacity-70 transition-opacity"
              aria-label={theme === "dark" ? t("themeLightAria") : t("themeDarkAria")}
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
                {t("account")}
              </Link>
              <UserButton
                afterSignOutUrl={`/${locale}`}
                userProfileUrl={`/${locale}/account`}
                userProfileMode="navigation"
                appearance={userButtonAppearance}
              />
            </div>
            <Link
              href="/account"
              className="lg:hidden p-2 text-foreground hover:opacity-70 transition-opacity"
              aria-label={t("viewAccountAria")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity"
              aria-label={t("viewShoppingBagAria")}
            >
              <span className="hidden lg:inline text-sm font-normal">{t("bag")}</span>
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
                  <span className="absolute -top-2 -end-2 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-medium">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {burgerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 top-14 bg-black/20 z-40"
            onClick={() => setBurgerOpen(false)}
            aria-hidden
          />
          <div
            className="lg:hidden absolute top-full inset-x-0 z-50 bg-background border-b border-border shadow-lg max-h-[85vh] overflow-y-auto"
            role="menu"
          >
            <div className="py-4 px-4 space-y-1">
              <div
                className="flex flex-col gap-1 border-b border-border pb-3 mb-1"
                role="navigation"
                aria-label={t("storeSelectionAria")}
              >
                <Link
                  href={streetwearHref}
                  onClick={(e) => {
                    if (isInStoreSection(pathname, "streetwear")) {
                      e.preventDefault();
                    }
                    openShopDrawer("streetwear");
                    setBurgerOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 rounded-none",
                    activeStore === "streetwear" && "bg-muted/30",
                  )}
                  role="menuitem"
                >
                  {t("streetwear")}
                </Link>
                <Link
                  href={formalHref}
                  onClick={(e) => {
                    if (isInStoreSection(pathname, "formal")) {
                      e.preventDefault();
                    }
                    openShopDrawer("formal");
                    setBurgerOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 rounded-none",
                    activeStore === "formal" && "bg-muted/30",
                  )}
                  role="menuitem"
                >
                  {t("formal")}
                </Link>
              </div>
              <Link
                href={isStoreType ? `/${storeType}/shop` : "/shop"}
                onClick={() => setBurgerOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50"
                role="menuitem"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                {t("search")}
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 text-start"
                role="menuitem"
                aria-label={theme === "dark" ? t("themeLightAria") : t("themeDarkAria")}
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
                {theme === "dark" ? t("lightMode") : t("darkMode")}
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
                {t("account")}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(true);
                  setBurgerOpen(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 text-start"
                role="menuitem"
                aria-label={t("viewShoppingBagAria")}
              >
                <span className="relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -end-2 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-medium">
                      {totalItems > 99 ? "99+" : totalItems}
                    </span>
                  )}
                </span>
                {totalItems > 0 ? t("bagWithCount", { count: totalItems }) : t("bag")}
              </button>
            </div>
          </div>
        </>
      )}

      <ShopDrawer
        isOpen={shopDrawerOpen}
        onClose={closeShopDrawer}
        categories={drawerCategories}
        storeType={shopDrawerStore ?? "streetwear"}
      />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </nav>
  );
}
