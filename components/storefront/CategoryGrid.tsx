import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { type ProductCategory } from "@/db/schema";

interface CategoryGridProps {
    categories: ProductCategory[];
    storeSlugs: string[];
    storeType: string;
}

export function CategoryGrid({ categories, storeSlugs, storeType }: CategoryGridProps) {
    return (
        <section className="px-4 pt-16 pb-8 md:px-6 md:pt-24 md:pb-12">
            <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-2 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                {categories.filter(c => storeSlugs.includes(c.slug)).map((cat) => (
                    <Link
                        key={cat.id}
                        href={`/${storeType}/shop?cat=${cat.slug}`}
                        className="group relative block aspect-[3/4] overflow-hidden"
                    >
                        <Image
                            src={cat.image ?? "/images/trousers.png"}
                            alt={cat.label}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 50vw, 33vw"
                            className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                        />
                        <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
                            aria-hidden
                        />
                        <p
                            className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] text-left line-clamp-2 text-xs font-medium leading-snug text-white opacity-95 transition-opacity group-hover:opacity-100 md:bottom-4 md:left-4 md:max-w-[calc(100%-2rem)] md:line-clamp-none md:text-sm"
                            style={{
                                textShadow:
                                    "0 1px 2px rgb(0 0 0 / 0.9), 0 2px 10px rgb(0 0 0 / 0.6), 0 0 1px rgb(0 0 0 / 1)",
                            }}
                        >
                            {cat.label}
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
