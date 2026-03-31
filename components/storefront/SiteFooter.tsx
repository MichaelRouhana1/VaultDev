"use client";

import { useState, useTransition, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
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

  return (
    <footer
      className="border-t border-border bg-muted/80 backdrop-blur-sm"
      style={{
        marginBottom: `var(${PRODUCT_STICKY_BUYBAR_CSS_VAR}, 0px)`,
      }}
    >
      <div className="mx-auto max-w-[1400px] px-6 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 md:gap-12">
          <div className="text-start">
            <h3 className="mb-4 text-sm font-medium text-foreground">{t("customerSupport")}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-foreground hover:opacity-60">
                  {t("contact")}
                </Link>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">{t("shipping")}</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">{t("returns")}</span>
              </li>
            </ul>
          </div>
          <div className="text-start">
            <h3 className="mb-4 text-sm font-medium text-foreground">{t("company")}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-foreground hover:opacity-60">
                  {t("about")}
                </Link>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">{t("careers")}</span>
              </li>
            </ul>
          </div>
          <div className="text-start">
            <h3 className="mb-4 text-sm font-medium text-foreground">{t("legal")}</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-muted-foreground">{t("privacy")}</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">{t("terms")}</span>
              </li>
            </ul>
          </div>
          <div className="text-start">
            <h3 className="mb-4 text-sm font-medium text-foreground">{t("follow")}</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-muted-foreground">{t("instagram")}</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">{t("twitter")}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-stretch gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-muted-foreground sm:text-start">
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
          className="mx-auto w-full max-h-[min(90vh,36rem)] gap-0 overflow-hidden rounded-t-3xl p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border px-6 py-5 text-start">
            <SheetTitle>{t("preferencesTitle")}</SheetTitle>
          </SheetHeader>

          <div className="flex max-h-[calc(min(90vh,36rem)-8.5rem)] flex-col gap-6 overflow-y-auto px-4 py-5 sm:px-6">
            <section className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {t("selectLanguage")}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {MOSAIK_LOCALES.map((loc) => {
                  const active = draftLocale === loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      disabled={localePending}
                      onClick={() => setDraftLocale(loc)}
                      className={cn(
                        "rounded-xl border-2 px-4 py-4 text-start text-base font-medium transition-colors",
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

            <section className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {t("selectCurrency")}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {STOREFRONT_CURRENCIES.map((code) => {
                  const active = draftCurrency === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setDraftCurrency(code)}
                      className={cn(
                        "rounded-xl border-2 px-4 py-4 text-start text-base font-medium transition-colors",
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

          <div className="border-t border-border px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:px-6">
            <Button
              type="button"
              className="w-full rounded-xl py-6 text-sm font-semibold uppercase tracking-widest"
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
