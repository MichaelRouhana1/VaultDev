"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { MosaikLocale } from "@/lib/i18n-locales";
import { MOSAIK_LOCALES } from "@/lib/i18n-locales";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PRODUCT_STICKY_BUYBAR_CSS_VAR } from "@/lib/product-sticky-buybar";

const LOCALE_LABEL_KEYS: Record<MosaikLocale, "localeEn" | "localeFr" | "localeAr"> = {
  en: "localeEn",
  fr: "localeFr",
  ar: "localeAr",
};

export function SiteFooter() {
  const t = useTranslations("SiteFooter");
  const tLocales = useTranslations("UtilityBar");
  const locale = useLocale() as MosaikLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [localePending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [sheetOpen]);

  const currentLabel = tLocales(LOCALE_LABEL_KEYS[locale]);

  const languageSheet =
    mounted && typeof document !== "undefined" ? (
      <>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSheetOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSheetOpen(false);
            }
          }}
          className={cn(
            "fixed inset-0 z-[9998] bg-black/60 transition-opacity duration-300",
            sheetOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          aria-hidden={!sheetOpen}
        />
        <div
          role="dialog"
          aria-modal={sheetOpen}
          aria-labelledby="site-footer-language-title"
          className={cn(
            "fixed inset-x-0 bottom-0 z-[9999] flex max-h-[min(85vh,32rem)] flex-col rounded-t-xl border border-border border-b-0 bg-background transition-transform duration-300 ease-out sm:left-1/2 sm:max-w-md sm:w-full sm:-translate-x-1/2",
            sheetOpen ? "translate-y-0" : "translate-y-full pointer-events-none",
          )}
          style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.15)" }}
        >
          <div className="border-b border-border px-6 py-4 text-start">
            <h2 id="site-footer-language-title" className="text-lg font-semibold leading-none tracking-tight">
              {t("languageTitle")}
            </h2>
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]" dir="auto">
            {MOSAIK_LOCALES.map((loc) => {
              const active = loc === locale;
              return (
                <button
                  key={loc}
                  type="button"
                  disabled={localePending}
                  onClick={() => {
                    startTransition(() => {
                      router.replace(pathname, { locale: loc });
                      setSheetOpen(false);
                    });
                  }}
                  className={cn(
                    "rounded-md px-4 py-3 text-start text-base font-medium transition-colors",
                    active ? "bg-foreground text-background" : "hover:bg-muted text-foreground",
                  )}
                >
                  {tLocales(LOCALE_LABEL_KEYS[loc])}
                </button>
              );
            })}
          </div>
        </div>
      </>
    ) : null;

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
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-label={t("openLanguage")}
          >
            <Globe className="size-4 shrink-0" aria-hidden />
            <span className="text-sm font-medium">{currentLabel}</span>
          </Button>
        </div>
      </div>

      {languageSheet != null ? createPortal(languageSheet, document.body) : null}
    </footer>
  );
}
