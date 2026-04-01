import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ResponsiveArtPicture } from "@/components/storefront/ResponsiveArtPicture";

interface LookbookItemData {
  id: number;
  label: string;
  imageUrl: string;
  mobileImageUrl?: string | null;
  href: string;
}

export async function LookbookSection({ items }: { items: LookbookItemData[] }) {
  if (!items || items.length === 0) return null;

  const t = await getTranslations("LookbookSection");

  return (
    <section className="px-6 py-24">
      <h2 className="mb-12 text-center text-sm font-medium uppercase tracking-[0.2em] text-foreground">{t("title")}</h2>
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="group">
            <div className="relative mb-4 aspect-[3/4] overflow-hidden">
              <ResponsiveArtPicture
                desktopSrc={item.imageUrl}
                mobileSrc={item.mobileImageUrl}
                alt={item.label}
                className="absolute inset-0 block h-full w-full"
                imgClassName="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                loading="lazy"
              />
            </div>
            <p className="text-sm font-normal text-foreground">{item.label}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
