import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="pt-14">
      <div className="max-w-[36ch] mx-auto px-6 py-24 text-center">
        <h1 className="text-xl font-normal text-foreground mb-4">About VAULT</h1>
        <p className="text-sm font-light text-foreground/90 leading-relaxed">
          Modern silhouettes. Thoughtful materials. Built to last.
        </p>
        <Link
          href="/shop"
          className="inline-block mt-8 text-sm font-normal text-foreground border-b border-foreground pb-1 hover:opacity-60 transition-opacity duration-200"
        >
          Explore the collection
        </Link>
      </div>
    </div>
  );
}
