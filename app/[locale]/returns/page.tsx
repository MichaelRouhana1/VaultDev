import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "SupportReturns" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function ReturnsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("SupportReturns");

  return (
    <div className="pt-14">
      <article className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed text-foreground/90">
        <h1 className="mb-6 text-2xl font-normal tracking-tight text-foreground">{t("h1")}</h1>
        <p className="mb-4">{t("p1")}</p>
        <p className="mb-4">{t("p2")}</p>
        <p className="mb-4">{t("p3")}</p>
        <p className="mb-4">
          {t("p4Before")}{" "}
          <Link href="/contact" className="font-medium text-foreground underline underline-offset-4 hover:opacity-80">
            {t("contactLink")}
          </Link>
          {t("p4After")}
        </p>
        <p className="text-muted-foreground">
          {t("termsBefore")}{" "}
          <Link href="/terms" className="font-medium text-foreground underline underline-offset-4 hover:opacity-80">
            {t("termsLink")}
          </Link>
          {t("termsAfter")}
        </p>
      </article>
    </div>
  );
}
