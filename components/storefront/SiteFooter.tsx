"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { MosaikLocale } from "@/lib/i18n-locales";
import { MOSAIK_LOCALES } from "@/lib/i18n-locales";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

  const currentLabel = tLocales(LOCALE_LABEL_KEYS[locale]);

  return (
    <footer className="border-t border-border bg-muted/80 backdrop-blur-sm">
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

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent
          className={cn(
            "fixed bottom-0 left-0 right-0 top-auto z-50 flex max-h-[min(85vh,32rem)] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-t-xl border-x-0 border-b-0 p-0 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <DialogHeader className="border-b border-border px-6 py-4 text-start">
            <DialogTitle>{t("languageTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 p-3" dir="auto">
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
                    active
                      ? "bg-foreground text-background"
                      : "hover:bg-muted text-foreground",
                  )}
                >
                  {tLocales(LOCALE_LABEL_KEYS[loc])}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
