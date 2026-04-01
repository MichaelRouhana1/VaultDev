import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLandingImages } from "@/actions/landing";
import { ResponsiveArtPicture } from "@/components/storefront/ResponsiveArtPicture";

const STREETWEAR_FALLBACK =
  "https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop";
const FORMAL_FALLBACK =
  "https://images.pexels.com/photos/3760854/pexels-photo-3760854.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop";

export default async function RootHomePage() {
  const t = await getTranslations("Landing");
  const images = await getLandingImages();
  const streetwearRow = images.find((img) => img.storeType === "streetwear");
  const formalRow = images.find((img) => img.storeType === "formal");
  const streetwearImg = streetwearRow?.imageUrl ?? STREETWEAR_FALLBACK;
  const formalImg = formalRow?.imageUrl ?? FORMAL_FALLBACK;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute start-1/2 top-8 z-50 flex -translate-x-1/2 flex-col items-center text-white mix-blend-difference drop-shadow-lg">
        <h1 className="text-2xl font-light uppercase tracking-[0.4em] md:text-3xl">VAULT</h1>
        <p className="mt-2 text-xs font-light uppercase tracking-[0.2em] opacity-80 md:text-sm">{t("selectStyle")}</p>
      </div>

      <Link
        href="/streetwear"
        className="group relative flex h-full w-full flex-1 cursor-pointer flex-col items-center justify-center transition-all duration-[800ms] md:hover:flex-[1.2]"
      >
        <ResponsiveArtPicture
          desktopSrc={streetwearImg}
          mobileSrc={streetwearRow?.mobileImageUrl}
          alt={t("altStreetwear")}
          className="absolute inset-0 block h-full w-full"
          imgClassName="h-full w-full object-cover object-top transition-transform duration-[2s] ease-out md:group-hover:scale-105"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-black/40 transition-colors duration-[800ms] group-hover:bg-black/20" />

        <div className="relative z-10 flex flex-col items-center p-8 text-center">
          <h2 className="mb-4 transform text-4xl font-black uppercase tracking-widest drop-shadow-xl transition-transform duration-[800ms] ease-out md:translate-y-4 md:group-hover:translate-y-0 md:text-6xl">
            {t("streetwear")}
          </h2>
          <span className="transform border-b-2 border-white pb-1 text-sm font-bold uppercase tracking-[0.2em] opacity-100 transition-all duration-[800ms] ease-out md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:text-base">
            {t("enterStore")}
          </span>
        </div>
      </Link>

      <Link
        href="/formal"
        className="group relative flex h-full w-full flex-1 cursor-pointer flex-col items-center justify-center transition-all duration-[800ms] md:hover:flex-[1.2]"
      >
        <ResponsiveArtPicture
          desktopSrc={formalImg}
          mobileSrc={formalRow?.mobileImageUrl}
          alt={t("altFormal")}
          className="absolute inset-0 block h-full w-full"
          imgClassName="h-full w-full object-cover object-top transition-transform duration-[2s] ease-out md:group-hover:scale-105"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-black/40 transition-colors duration-[800ms] group-hover:bg-black/20" />

        <div className="relative z-10 flex flex-col items-center p-8 text-center">
          <h2 className="mb-4 transform text-4xl font-light uppercase tracking-[0.2em] drop-shadow-xl transition-transform duration-[800ms] ease-out md:translate-y-4 md:group-hover:translate-y-0 md:text-6xl">
            {t("formal")}
          </h2>
          <span className="transform border-b border-white pb-1 text-sm font-light uppercase tracking-[0.2em] opacity-100 transition-all duration-[800ms] ease-out md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:text-base">
            {t("enterStore")}
          </span>
        </div>
      </Link>
    </div>
  );
}
