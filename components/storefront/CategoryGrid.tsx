import { Link } from "@/i18n/navigation";
import { StorefrontImage } from "@/components/storefront/StorefrontImage";
import { type ProductCategory } from "@/db/schema";
import { storefrontImageCandidates } from "@/lib/cf-image";

const tileSizes = "(min-width: 1448px) 451px, (min-width: 1024px) calc((100vw - 96px) / 3), (min-width: 768px) calc((100vw - 72px) / 2), calc((100vw - 40px) / 2)";
const tileClass = "h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]";

interface CategoryGridProps {
    categories: ProductCategory[];
    storeSlugs: string[];
    storeType: string;
}

export function CategoryGrid({ categories, storeSlugs, storeType }: CategoryGridProps) {
    return (
        <section className="px-4 pt-16 pb-8 md:px-6 md:pt-24 md:pb-12">
            <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-2 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                {categories.filter(c => storeSlugs.includes(c.slug)).map((cat) => {
                    const image = storefrontImageCandidates(cat.image ?? "/images/trousers.png", [400, 1000]);
                    return (
                      <Link
                        key={cat.id}
                        href={`/${storeType}/shop?cat=${cat.slug}`}
                        className="group relative block aspect-[3/4] overflow-hidden"
                      >
                        {image.srcSet ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Cloudflare serves these responsive candidates.
                            <img
                                {...image}
                                alt={cat.label}
                                sizes={tileSizes}
                                loading="lazy"
                                decoding="async"
                                className={`absolute inset-0 ${tileClass}`}
                            />
                        ) : (
                            <StorefrontImage src={image.src} alt={cat.label} fill sizes={tileSizes} className={tileClass} />
                        )}
                        <p
                            className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] text-left line-clamp-2 text-[1.125rem] font-medium leading-snug text-white transition-opacity group-hover:opacity-100 md:bottom-4 md:left-4 md:max-w-[calc(100%-2rem)] md:line-clamp-none"
                            style={{
                                textShadow:
                                    "0 1px 2px rgb(0 0 0 / 0.9), 0 2px 10px rgb(0 0 0 / 0.6), 0 0 1px rgb(0 0 0 / 1)",
                            }}
                        >
                            {cat.label}
                        </p>
                      </Link>
                    );
                })}
            </div>
        </section>
    );
}
