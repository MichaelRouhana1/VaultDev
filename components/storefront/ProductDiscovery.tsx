"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/context/CurrencyContext";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

export interface DiscoverProduct {
    id: number;
    name: string;
    price: string;
    displayPrice: string;
    description?: string | null;
    onSale: boolean;
    saveAmountUsd: number;
    storeType: string;
    images: string[];
}

interface ProductDiscoveryProps {
    products: DiscoverProduct[];
    currentStoreType: string;
    fallbackImage: string;
}

export function ProductDiscovery({ products, currentStoreType, fallbackImage }: ProductDiscoveryProps) {
    const { formatPrice } = useCurrency();
    const t = useTranslations("ProductCard");

    return (
        <section className="px-6 pt-10 pb-24 bg-background md:pt-14" aria-labelledby="discover-heading">
            <h2
                id="discover-heading"
                className="text-sm font-medium text-foreground tracking-[0.2em] uppercase mb-12 text-center"
            >
                Discover
            </h2>
            {products.length > 0 ? (
                <Carousel
                    className="w-full"
                    opts={{
                        align: "start",
                        loop: false,
                        dragFree: true,
                        containScroll: "trimSnaps",
                    }}
                    viewportClassName="cursor-grab active:cursor-grabbing select-none"
                >
                    <CarouselContent className="gap-8">
                        {products.map((product) => {
                            const imageUrl = product.images?.[0] ?? fallbackImage;
                            const itemStoreType = product.storeType || currentStoreType;
                            return (
                                <CarouselItem key={product.id} className="basis-[220px] shrink-0 grow-0 pl-0">
                                    <Link
                                        href={`/${itemStoreType}/product/${product.id}`}
                                        className="block w-[220px] max-w-full group outline-none"
                                        draggable={false}
                                    >
                                        <div className="aspect-[2/3] overflow-hidden mb-4 relative">
                                            {product.onSale && product.saveAmountUsd > 0 && (
                                                <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-destructive text-destructive-foreground">
                                                    {t("saveBadge", { amount: formatPrice(product.saveAmountUsd) })}
                                                </span>
                                            )}
                                            <Image
                                                src={imageUrl}
                                                alt={
                                                    product.description
                                                        ? `${product.name} - ${product.description}`
                                                        : product.name
                                                }
                                                fill
                                                className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                                            />
                                        </div>
                                        <p className="text-sm font-normal text-foreground">{product.name}</p>
                                        <p className="text-sm font-light text-muted-foreground mt-1">
                                            {product.onSale ? (
                                                <>
                                                    <span className="text-destructive font-medium">
                                                        {formatPrice(product.displayPrice)}
                                                    </span>{" "}
                                                    <span className="line-through">{formatPrice(product.price)}</span>
                                                </>
                                            ) : (
                                                formatPrice(product.displayPrice)
                                            )}
                                        </p>
                                    </Link>
                                </CarouselItem>
                            );
                        })}
                    </CarouselContent>
                </Carousel>
            ) : (
                <div className="w-full text-center py-12">
                    <p className="text-sm font-normal text-muted-foreground">
                        No products available yet. Check back soon.
                    </p>
                </div>
            )}
        </section>
    );
}
