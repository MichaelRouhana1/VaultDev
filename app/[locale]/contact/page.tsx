import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Instagram } from "lucide-react";
import { WhatsAppLogo } from "@/components/icons/WhatsAppLogo";
import { getLegalContactEmail } from "@/lib/legal-contact-email";
import {
  VAULT_INSTAGRAM_URL,
  VAULT_WHATSAPP_DISPLAY,
  vaultWhatsAppHref,
} from "@/lib/storefront-social";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "SupportContact" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("SupportContact");
  const email = getLegalContactEmail();

  return (
    <div className="pt-14">
      <article className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed text-foreground/90">
        <h1 className="mb-6 text-2xl font-normal tracking-tight text-foreground">{t("h1")}</h1>
        <p className="mb-8 text-muted-foreground">{t("intro")}</p>

        <ul className="space-y-6">
          <li className="flex gap-4">
            <span className="mt-0.5 shrink-0 text-muted-foreground">{t("labelEmail")}</span>
            <a
              href={`mailto:${email}`}
              className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
            >
              {email}
            </a>
          </li>
          <li className="flex flex-wrap items-center gap-4">
            <span className="shrink-0 text-muted-foreground">{t("labelWhatsapp")}</span>
            <a
              href={vaultWhatsAppHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4 hover:opacity-80"
            >
              <WhatsAppLogo className="size-5 shrink-0" />
              <span>{VAULT_WHATSAPP_DISPLAY}</span>
            </a>
          </li>
          <li className="flex flex-wrap items-center gap-4">
            <span className="shrink-0 text-muted-foreground">{t("labelInstagram")}</span>
            <a
              href={VAULT_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4 hover:opacity-80"
            >
              <Instagram className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
              <span>@vaultstreetcore</span>
            </a>
          </li>
        </ul>

        <p className="mt-10 text-xs text-muted-foreground">{t("responseNote")}</p>
      </article>
    </div>
  );
}
