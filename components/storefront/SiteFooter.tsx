"use client";

import { useState, useTransition, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname as useNextPathname } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { MosaikLocale } from "@/lib/i18n-locales";
import { MOSAIK_LOCALES } from "@/lib/i18n-locales";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PRODUCT_STICKY_BUYBAR_CSS_VAR } from "@/lib/product-sticky-buybar";
import { useCurrency } from "@/context/CurrencyContext";
import {
  type StorefrontCurrency,
  STOREFRONT_CURRENCIES,
} from "@/lib/storefront-currency";

const LOCALE_LABEL_KEYS: Record<MosaikLocale, "localeEn" | "localeFr" | "localeAr"> = {
  en: "localeEn",
  fr: "localeFr",
  ar: "localeAr",
};

const CURRENCY_LABEL_KEYS: Record<StorefrontCurrency, "currencyOptionUsd" | "currencyOptionEur" | "currencyOptionLbp"> = {
  USD: "currencyOptionUsd",
  EUR: "currencyOptionEur",
  LBP: "currencyOptionLbp",
};

export function SiteFooter() {
  const t = useTranslations("SiteFooter");
  const tLocales = useTranslations("UtilityBar");
  const locale = useLocale() as MosaikLocale;
  const router = useRouter();
  const pathname = usePathname();
  const nextPathname = useNextPathname();
  const { currency, setCurrency } = useCurrency();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftLocale, setDraftLocale] = useState<MosaikLocale>(locale);
  const [draftCurrency, setDraftCurrency] = useState<StorefrontCurrency>(currency);
  const [localePending, startTransition] = useTransition();

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setSheetOpen(open);
      if (open) {
        setDraftLocale(locale);
        setDraftCurrency(currency);
      }
    },
    [locale, currency],
  );

  const handleSavePreferences = () => {
    startTransition(() => {
      if (draftLocale !== locale) {
        router.replace(pathname, { locale: draftLocale });
      }
      setCurrency(draftCurrency);
      setSheetOpen(false);
    });
  };

  const currentLanguageLabel = tLocales(LOCALE_LABEL_KEYS[locale]);
  const buttonSummary = t("preferencesSummary", {
    language: currentLanguageLabel,
    currency,
  });

  /** Locale-prefixed routes (e.g. `/en/search`) still contain `/search`. */
  if (nextPathname.includes("/search")) {
    return null;
  }

  /** Bag page uses its own fixed checkout bar; hide global footer. */
  if (nextPathname.includes("/bag")) {
    return null;
  }

  /** Admin area uses its own chrome; hide storefront footer. */
  if (nextPathname.includes("/admin")) {
    return null;
  }

  /** Clerk auth pages are full-viewport; hide storefront footer. */
  if (nextPathname.includes("/sign-in") || nextPathname.includes("/sign-up")) {
    return null;
  }

  const sectionTitleClass =
    "mb-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground md:mb-3 md:text-xs md:tracking-[0.18em]";
  /** Extra space below each column; list rows stay tight above it. */
  const sectionBlockClass = "text-start pb-8 md:pb-10 lg:pb-12";
  const footerLinkClass =
    "block py-0 text-sm font-normal leading-snug text-foreground underline-offset-4 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  /** Placeholder rows (no route yet): same contrast as links, no fake “disabled grey”. */
  const footerStaticClass = "block py-0 text-sm font-normal leading-snug text-foreground";

  return (
    <footer
      className="border-t border-border bg-muted/80 backdrop-blur-sm"
      style={{
        marginBottom: `var(${PRODUCT_STICKY_BUYBAR_CSS_VAR}, 0px)`,
      }}
    >
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 md:py-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:gap-x-8 sm:gap-y-3 md:grid-cols-4 md:gap-x-10 md:gap-y-6 lg:gap-12">
          <div className={sectionBlockClass}>
            <h3 className={sectionTitleClass}>{t("customerSupport")}</h3>
            <ul className="flex flex-col gap-0.5">
              <li>
                <Link href="/about" className={footerLinkClass}>
                  {t("contact")}
                </Link>
              </li>
              <li>
                <span className={footerStaticClass}>{t("shipping")}</span>
              </li>
              <li>
                <span className={footerStaticClass}>{t("returns")}</span>
              </li>
            </ul>
          </div>
          <div className={sectionBlockClass}>
            <h3 className={sectionTitleClass}>{t("company")}</h3>
            <ul className="flex flex-col gap-0.5">
              <li>
                <Link href="/about" className={footerLinkClass}>
                  {t("about")}
                </Link>
              </li>
              <li>
                <span className={footerStaticClass}>{t("careers")}</span>
              </li>
            </ul>
          </div>
          <div className={sectionBlockClass}>
            <h3 className={sectionTitleClass}>{t("legal")}</h3>
            <ul className="flex flex-col gap-0.5">
              <li>
                <Link href="/privacy" className={footerLinkClass}>
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className={footerLinkClass}>
                  {t("terms")}
                </Link>
              </li>
            </ul>
          </div>
          <div className={sectionBlockClass}>
            <h3 className={sectionTitleClass}>{t("follow")}</h3>
            <ul className="flex flex-col gap-0.5">
              <li>
                <span className={footerStaticClass}>{t("instagram")}</span>
              </li>
              <li>
                <span className={footerStaticClass}>{t("twitter")}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-stretch gap-3 border-t border-border pt-6 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-8">
          <p className="text-center text-sm text-foreground/80 sm:text-start">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="inline-flex items-center justify-center gap-2 self-center sm:self-auto"
            onClick={() => handleOpenChange(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-label={t("openPreferences")}
          >
            <Globe className="size-4 shrink-0" aria-hidden />
            <span className="text-sm font-medium">{buttonSummary}</span>
          </Button>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="h-auto w-full max-w-none max-h-[min(72vh,23.5rem)] gap-0 overflow-hidden rounded-t-2xl border-x-0 p-0 sm:rounded-t-3xl"
        >
          <SheetHeader className="border-b border-border px-4 py-3 text-start sm:px-8 lg:px-12">
            <SheetTitle className="text-base">{t("preferencesTitle")}</SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 overflow-y-auto px-4 py-3 sm:gap-6 sm:px-8 lg:gap-10 lg:px-12">
            <section className="min-w-0 space-y-2">
              <h3 className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("selectLanguage")}
              </h3>
              <div className="flex flex-col gap-1.5">
                {MOSAIK_LOCALES.map((loc) => {
                  const active = draftLocale === loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      disabled={localePending}
                      onClick={() => setDraftLocale(loc)}
                      className={cn(
                        "rounded-lg border-2 px-3 py-2.5 text-start text-sm font-medium transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card text-foreground hover:bg-muted/80",
                      )}
                    >
                      {tLocales(LOCALE_LABEL_KEYS[loc])}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="min-w-0 space-y-2">
              <h3 className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("selectCurrency")}
              </h3>
              <div className="flex flex-col gap-1.5">
                {STOREFRONT_CURRENCIES.map((code) => {
                  const active = draftCurrency === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setDraftCurrency(code)}
                      className={cn(
                        "rounded-lg border-2 px-3 py-2.5 text-start text-sm font-medium transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card text-foreground hover:bg-muted/80",
                      )}
                    >
                      {t(CURRENCY_LABEL_KEYS[code])}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="border-t border-border px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-8 lg:px-12">
            <Button
              type="button"
              className="w-full rounded-lg py-3 text-xs font-semibold uppercase tracking-widest sm:text-sm"
              disabled={localePending}
              onClick={handleSavePreferences}
            >
              {t("savePreferences")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </footer>
  );
}
