"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useCurrency } from "@/context/CurrencyContext";

export interface DiscoverProduct {
    id: number;
    name: string;
    price: string;
    displayPrice: string;
    description?: string | null;
    onSale: boolean;
    percentOff: number;
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
    return (
        <section className="px-6 pt-10 pb-24 bg-background md:pt-14">
            <h2 className="text-sm font-medium text-foreground tracking-[0.2em] uppercase mb-12 text-center">
                Discover
            </h2>
            <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-hide">
                {products.length > 0 ? (
                    products.map((product) => {
                        const imageUrl = product.images?.[0] ?? fallbackImage;
                        const itemStoreType = product.storeType || currentStoreType;
                        return (
                            <Link
                                key={product.id}
                                href={`/${itemStoreType}/product/${product.id}`}
                                className="flex-shrink-0 w-[220px] group"
                            >
                                <div className="aspect-[2/3] overflow-hidden mb-4 relative">
                                    {product.onSale && product.percentOff > 0 && (
                                        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-destructive text-destructive-foreground">
                                            -{product.percentOff}%
                                        </span>
                                    )}
                                    <Image
                                        src={imageUrl}
                                        alt={product.description ? `${product.name} - ${product.description}` : product.name}
                                        fill
                                        className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                                    />
                                </div>
                                <p className="text-sm font-normal text-foreground">{product.name}</p>
                                <p className="text-sm font-light text-muted-foreground mt-1">
                                    {product.onSale ? (
                                        <>
                                            <span className="line-through">{formatPrice(product.price)}</span>{" "}
                                            <span className="text-destructive font-medium">{formatPrice(product.displayPrice)}</span>
                                        </>
                                    ) : (
                                        formatPrice(product.displayPrice)
                                    )}
                                </p>
                            </Link>
                        );
                    })
                ) : (
                    <div className="w-full text-center py-12">
                        <p className="text-sm font-normal text-muted-foreground">
                            No products available yet. Check back soon.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
