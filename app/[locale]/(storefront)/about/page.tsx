import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "AboutPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AboutPage");

  return (
    <div className="pt-14">
      <article className="mx-auto max-w-xl px-6 py-16 text-center sm:py-20 md:py-24">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          {t("kicker")}
        </p>
        <h1 className="mt-4 text-3xl font-light tracking-[0.2em] text-foreground sm:text-4xl md:text-5xl">
          {t("brandName")}
        </h1>
        <p className="mx-auto mt-8 max-w-[34ch] text-base font-normal leading-relaxed text-foreground/90 sm:text-lg">
          {t("hook")}
        </p>

        <div className="mx-auto mt-12 max-w-[40ch] space-y-6 text-left text-sm leading-relaxed text-foreground/85 sm:text-base">
          <p>{t("p1")}</p>
          <p>{t("p2")}</p>
          <p>{t("p3")}</p>
        </div>

        <p className="mx-auto mt-12 max-w-[36ch] text-base font-medium text-foreground sm:text-lg">{t("ctaTitle")}</p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button asChild className="min-w-[200px] rounded-md uppercase tracking-widest">
            <Link href="/streetwear/shop">{t("ctaStreetwear")}</Link>
          </Button>
          <Button asChild variant="outline" className="min-w-[200px] rounded-md uppercase tracking-widest">
            <Link href="/formal/shop">{t("ctaFormal")}</Link>
          </Button>
        </div>
        <p className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <Link href="/contact" className="underline underline-offset-4 hover:text-foreground">
            {t("footerContact")}
          </Link>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <Link href="/streetwear" className="underline underline-offset-4 hover:text-foreground">
            {t("footerNewsletter")}
          </Link>
        </p>
      </article>
    </div>
  );
}
