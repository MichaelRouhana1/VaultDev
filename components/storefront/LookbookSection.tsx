import { Link } from "@/i18n/navigation";
import Image from "next/image";

interface LookbookItemData {
    id: number;
    label: string;
    imageUrl: string;
    href: string;
}

export function LookbookSection({ items }: { items: LookbookItemData[] }) {
    if (!items || items.length === 0) return null;

    return (
        <section className="py-24 px-6">
            <h2 className="text-sm font-medium text-foreground tracking-[0.2em] uppercase mb-12 text-center">
                Get the Look
            </h2>
            <div className="max-w-[1400px] mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                {items.map((item) => (
                    <Link key={item.id} href={item.href} className="group">
                        <div className="aspect-[3/4] overflow-hidden mb-4 relative">
                            <Image
                                src={item.imageUrl}
                                alt={item.label}
                                fill
                                className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                            />
                        </div>
                        <p className="text-sm font-normal text-foreground">{item.label}</p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
