import { Link } from "@/i18n/navigation";
import Image from "next/image";

interface HeroFallbackProps {
    storeType: string;
    fallbackImage: string;
}

export function HeroFallback({ storeType, fallbackImage }: HeroFallbackProps) {
    return (
        <section className="w-full min-h-[52vh] sm:min-h-[62vh] md:h-[78vh] flex items-center justify-center relative overflow-hidden">
            <Image
                src={fallbackImage}
                alt=""
                fill
                className="object-cover"
                priority
            />
            <div className="relative z-10 max-w-[36ch] text-center px-6">
                <h1 className="text-3xl font-normal text-foreground mb-4 capitalize">
                    {storeType} Collection
                </h1>
                <p className="text-sm font-light text-foreground/90">
                    Coming soon. We are carefully curating our new collection.
                </p>
                <div className="flex justify-center gap-6 mt-8 relative z-20">
                    <Link
                        href="/"
                        className="inline-block text-sm font-normal text-foreground border-b border-foreground pb-1 hover:opacity-60 transition-opacity duration-200"
                    >
                        Back to Vault
                    </Link>
                </div>
            </div>
        </section>
    );
}
