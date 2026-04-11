"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

function isPlausibleEmail(value: string): boolean {
  const v = value.trim();
  return v.length > 3 && v.includes("@") && v.includes(".");
}

export function NewsletterForm() {
  const t = useTranslations("NewsletterForm");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);

  const canSubmit = consent && isPlausibleEmail(email);

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-[480px] text-center">
        <p className="mb-6 text-sm font-normal text-foreground">{t("blurb")}</p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <input
            type="email"
            name="newsletterEmail"
            aria-label={t("emailAria")}
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full rounded-md border border-border bg-transparent px-4 py-3 text-sm font-normal text-foreground outline-none transition-colors duration-200 placeholder:text-muted-foreground focus:border-foreground"
          />
          <div className="flex items-start gap-2 text-start">
            <input
              id="newsletterTermsConsent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 size-4 shrink-0 rounded border-border accent-foreground"
            />
            <label htmlFor="newsletterTermsConsent" className="cursor-pointer text-sm font-normal leading-snug text-muted-foreground">
              <span className="text-foreground">{t("consentLead")}</span>{" "}
              <Link href="/terms" className="font-medium text-foreground underline underline-offset-4 hover:opacity-80">
                {t("termsLink")}
              </Link>
              {t("consentMid")}
              <Link href="/privacy" className="font-medium text-foreground underline underline-offset-4 hover:opacity-80">
                {t("privacyLink")}
              </Link>
              {t("consentEnd")}
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md border border-foreground px-6 py-3 text-sm font-normal text-foreground transition-colors duration-200 enabled:hover:bg-foreground enabled:hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("subscribe")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
