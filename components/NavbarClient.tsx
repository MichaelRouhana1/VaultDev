"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { UserButton, useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useCart } from "@/context/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { ShopDrawer } from "@/components/ShopDrawer";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  mosaikClerkUserButtonPopoverElementsDark,
  mosaikClerkUserButtonPopoverElementsLight,
  mosaikClerkUserButtonVariablesDark,
  mosaikClerkUserButtonVariablesLight,
} from "@/lib/clerk-auth-appearance";
import type { ProductCategory } from "@/actions/categories";
import type { StoreTypeSlug } from "@/lib/preferred-store";
import { isStrictStoreLanding, storeSectionFromPathname } from "@/lib/store-nav";
import { cn } from "@/lib/utils";
import { isDashboardRole } from "@/lib/clerk-dashboard-role";
import { useShopListingNav } from "@/components/storefront/ShopListingNavContext";

function subscribeMaxLg(callback: () => void) {
  const mq = window.matchMedia("(max-width: 1023px)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getMaxLgSnapshot() {
  return window.matchMedia("(max-width: 1023px)").matches;
}

/** SSR: assume desktop so first paint matches until hydrated (avoids desktop flash). */
function getMaxLgServerSnapshot() {
  return false;
}

export interface NavbarClientProps {
  streetwearCategories: ProductCategory[];
  formalCategories: ProductCategory[];
}

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

export function NavbarClient({ streetwearCategories, formalCategories }: NavbarClientProps) {
  const t = useTranslations("Navbar");
  const tCommon = useTranslations("Common");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const params = useParams<{ storeType?: string }>();
  const { sessionClaims } = useAuth();
  const { totalItems, setOpenCart } = useCart();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const maxLg = useSyncExternalStore(subscribeMaxLg, getMaxLgSnapshot, getMaxLgServerSnapshot);
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
  /** Shared drawer state (Navbar is the single owner; ShopDrawer is controlled). */
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerStoreType, setDrawerStoreType] = useState<StoreTypeSlug | null>(null);
  const [burgerOpen, setBurgerOpen] = useState(false);
  /** Mobile nav sheet: which store’s categories to show (updates immediately on tab tap). */
  const [mobileMenuStore, setMobileMenuStore] = useState<StoreTypeSlug>("streetwear");
  /** Mobile store landing: scrolled past hero into categories — solid bar + normal theme like other pages. */
  const [landingPastHero, setLandingPastHero] = useState(false);

  const activeStore = activeStoreFromRoute(params.storeType, pathname);

  const drawerCategories =
    (drawerStoreType ?? "streetwear") === "formal" ? formalCategories : streetwearCategories;

  const mobileMenuCategories =
    mobileMenuStore === "formal" ? formalCategories : streetwearCategories;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    setOpenCart(() => setCartOpen(true));
  }, [setOpenCart]);

  useEffect(() => {
    router.prefetch("/streetwear");
    router.prefetch("/formal");
  }, [router]);

  const isStoreLandingOverlay = pathname != null && isStrictStoreLanding(pathname);

  useEffect(() => {
    if (!isStoreLandingOverlay || !maxLg) {
      setLandingPastHero(false);
      return;
    }
    const HEADER_PX = 56; // matches h-14

    const update = () => {
      const sentinel = document.getElementById("store-landing-categories-sentinel");
      if (!sentinel) {
        setLandingPastHero(false);
        return;
      }
      setLandingPastHero(sentinel.getBoundingClientRect().top <= HEADER_PX);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isStoreLandingOverlay, maxLg, pathname]);

  useEffect(() => {
    if (!burgerOpen) return;
    const initial: StoreTypeSlug =
      activeStore === "streetwear" || activeStore === "formal" ? activeStore : "streetwear";
    setMobileMenuStore(initial);
  }, [burgerOpen, activeStore]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setBurgerOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const handleMobileMenuStoreTab = (slug: StoreTypeSlug) => {
    setMobileMenuStore(slug);
    router.push(`/${slug}`);
  };

  const closeShopDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleHeaderSectionClick = (clickedSection: StoreTypeSlug) => {
    const currentStoreType = activeStore;
    const isStrictlyOnLandingPage =
      currentStoreType != null &&
      isStrictStoreLanding(pathname) &&
      storeSectionFromPathname(pathname) === currentStoreType;

    setDrawerStoreType(clickedSection);
    setIsDrawerOpen(true);

    if (isStrictlyOnLandingPage && clickedSection !== currentStoreType) {
      router.push(`/${clickedSection}`);
    }
  };

  const showDashboardLink = isDashboardRole(sessionClaims?.metadata?.role);
  const shopNav = useShopListingNav();

  if (pathname?.startsWith("/admin")) return null;
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) return null;
  if (pathname === "/") return null;

  const vaultHref =
    activeStore === "streetwear" ? "/streetwear" : activeStore === "formal" ? "/formal" : "/";

  const storeLinkClass = (slug: StoreTypeSlug) =>
    cn(
      "text-[10px] sm:text-xs tracking-[0.22em] uppercase transition-colors",
      activeStore === slug
        ? "font-semibold text-foreground underline decoration-1 underline-offset-4"
        : "font-normal text-foreground/45 hover:text-foreground/80",
    );

  const storeSectionButtonClass = (slug: StoreTypeSlug) =>
    cn(
      storeLinkClass(slug),
      "cursor-pointer bg-transparent border-0 p-0 font-inherit text-start hover:opacity-100",
    );

  const mobileMenuTabClass = (slug: StoreTypeSlug) =>
    cn(
      "text-xs uppercase tracking-[0.2em] transition-colors bg-transparent border-0 p-0 cursor-pointer whitespace-nowrap",
      mobileMenuStore === slug
        ? "font-semibold text-foreground"
        : "font-normal text-muted-foreground hover:text-foreground/80",
    );

  const mobileShopBase = `/${mobileMenuStore}/shop`;

  /** Mobile/tablet store landing: transparent over hero; solid when sheets open or scrolled into categories. */
  const landingBarSolid =
    isStoreLandingOverlay && (burgerOpen || isDrawerOpen || cartOpen || landingPastHero);

  /** Mobile store landing: force dark nav over hero; normal theme once scrolled into categories (matches other pages). */
  const mobileStoreLandingDark = isStoreLandingOverlay && maxLg && !landingPastHero;

  return (
    <nav
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-200",
        mobileStoreLandingDark && "dark",
        isStoreLandingOverlay && !landingBarSolid
          ? "max-lg:border-b-0 max-lg:bg-transparent max-lg:backdrop-blur-none max-lg:supports-[backdrop-filter]:bg-transparent lg:border-b lg:border-border lg:bg-background/95 lg:backdrop-blur lg:supports-[backdrop-filter]:lg:bg-background/60"
          : "border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      )}
    >
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
            {showDashboardLink && (
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
              <button
                type="button"
                onClick={() => handleHeaderSectionClick("streetwear")}
                className={storeSectionButtonClass("streetwear")}
              >
                {t("streetwear")}
              </button>
              <span className="text-foreground/25 text-[10px] select-none" aria-hidden>
                |
              </span>
              <button
                type="button"
                onClick={() => handleHeaderSectionClick("formal")}
                className={storeSectionButtonClass("formal")}
              >
                {t("formal")}
              </button>
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
              href="/search"
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

      <Sheet open={burgerOpen} onOpenChange={setBurgerOpen}>
        <SheetContent
          side="left"
          overlayClassName="lg:hidden"
          className={cn(
            "inset-x-0 inset-y-0 flex h-dvh min-h-0 w-full max-w-none flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none lg:hidden",
          )}
        >
          <SheetTitle className="sr-only">{t("mobileNavTitle")}</SheetTitle>

          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div
              className="flex flex-row items-baseline justify-start gap-6"
              role="tablist"
              aria-label={t("storeSelectionAria")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={mobileMenuStore === "streetwear"}
                onClick={() => handleMobileMenuStoreTab("streetwear")}
                className={mobileMenuTabClass("streetwear")}
              >
                {t("streetwear")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileMenuStore === "formal"}
                onClick={() => handleMobileMenuStoreTab("formal")}
                className={mobileMenuTabClass("formal")}
              >
                {t("formal")}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setBurgerOpen(false)}
              className="shrink-0 p-2 text-foreground hover:opacity-70"
              aria-label={t("closeMenu")}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-1">
            <nav
              className="space-y-0.5"
              role="navigation"
              aria-label={t("categoryMenuAria", {
                store: mobileMenuStore === "streetwear" ? t("streetwear") : t("formal"),
              })}
            >
              <Link
                href="/search"
                onClick={() => setBurgerOpen(false)}
                className="flex items-center gap-3 border-b border-border py-3 text-base font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                <span className="text-muted-foreground" aria-hidden>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </span>
                {t("search")}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setBurgerOpen(false);
                  shopNav?.startShopNavigation(mobileShopBase);
                }}
                className="block w-full py-3 text-start text-base font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                {t("viewAllShop")}
              </button>
              {mobileMenuCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setBurgerOpen(false);
                    shopNav?.startShopNavigation(`${mobileShopBase}?cat=${encodeURIComponent(cat.slug)}`);
                  }}
                  className="block w-full py-3 text-start text-base font-medium text-foreground transition-colors hover:bg-muted/50"
                >
                  {cat.label}
                </button>
              ))}
            </nav>

            {showDashboardLink && (
              <div className="mt-4 border-t border-border pt-4">
                <Link
                  href="/admin"
                  onClick={() => setBurgerOpen(false)}
                  className="block py-3 text-sm font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-muted/50"
                >
                  {t("dashboard")}
                </Link>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border bg-background px-5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 py-3 text-start text-base font-medium text-foreground transition-colors hover:bg-muted/50"
              aria-label={theme === "dark" ? t("themeLightAria") : t("themeDarkAria")}
            >
              {theme === "dark" ? (
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
              {theme === "dark" ? t("lightMode") : t("darkMode")}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <ShopDrawer
        isOpen={isDrawerOpen}
        onClose={closeShopDrawer}
        categories={drawerCategories}
        storeType={drawerStoreType ?? "streetwear"}
      />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </nav>
  );
}
