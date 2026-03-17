import Image from "next/image";
import Link from "next/link";
import { getLandingImages } from "@/actions/landing";

const STREETWEAR_FALLBACK =
  "https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop";
const FORMAL_FALLBACK =
  "https://images.pexels.com/photos/3760854/pexels-photo-3760854.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop";

export default async function RootHomePage() {
  const images = await getLandingImages();
  const streetwearImg = images.find((img) => img.storeType === "streetwear")?.imageUrl ?? STREETWEAR_FALLBACK;
  const formalImg = images.find((img) => img.storeType === "formal")?.imageUrl ?? FORMAL_FALLBACK;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full overflow-hidden bg-black text-white">

      {/* GLOBAL LOGO OVERLAY */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center mix-blend-difference text-white drop-shadow-lg">
        <h1 className="text-2xl md:text-3xl font-light tracking-[0.4em] uppercase">
          MOSAIK
        </h1>
        <p className="mt-2 text-xs md:text-sm font-light tracking-[0.2em] opacity-80 uppercase">
          Select Your Style
        </p>
      </div>

      {/* LEFT: STREETWEAR */}
      <Link
        href="/streetwear"
        className="group relative flex-1 h-full w-full flex flex-col items-center justify-center cursor-pointer transition-all duration-[800ms] md:hover:flex-[1.2]"
      >
        <Image
          src={streetwearImg}
          alt="Streetwear Category"
          fill
          className="object-cover transition-transform duration-[2s] ease-out md:group-hover:scale-105"
          priority

        />
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-[800ms]" />

        <div className="relative z-10 text-center flex flex-col items-center p-8">
          <h2 className="text-4xl md:text-6xl font-black tracking-widest uppercase drop-shadow-xl mb-4 transform md:translate-y-4 md:group-hover:translate-y-0 transition-transform duration-[800ms] ease-out">
            Streetwear
          </h2>
          <span className="opacity-100 md:opacity-0 md:group-hover:opacity-100 border-b-2 border-white pb-1 text-sm md:text-base font-bold tracking-[0.2em] uppercase transition-all duration-[800ms] ease-out transform md:translate-y-4 md:group-hover:translate-y-0">
            Enter Store
          </span>
        </div>
      </Link>

      {/* RIGHT: FORMAL */}
      <Link
        href="/formal"
        className="group relative flex-1 h-full w-full flex flex-col items-center justify-center cursor-pointer transition-all duration-[800ms] md:hover:flex-[1.2]"
      >
        <Image
          src={formalImg}
          alt="Formal Category"
          fill
          className="object-cover transition-transform duration-[2s] ease-out md:group-hover:scale-105"
          priority

        />
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-[800ms]" />

        <div className="relative z-10 text-center flex flex-col items-center p-8">
          <h2 className="text-4xl md:text-6xl font-light tracking-[0.2em] uppercase drop-shadow-xl mb-4 transform md:translate-y-4 md:group-hover:translate-y-0 transition-transform duration-[800ms] ease-out">
            Formal
          </h2>
          <span className="opacity-100 md:opacity-0 md:group-hover:opacity-100 border-b border-white pb-1 text-sm md:text-base font-light tracking-[0.2em] uppercase transition-all duration-[800ms] ease-out transform md:translate-y-4 md:group-hover:translate-y-0">
            Enter Store
          </span>
        </div>
      </Link>
    </div>
  );
}
