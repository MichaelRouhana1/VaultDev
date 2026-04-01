"use client";

import { useState, useEffect, useCallback } from "react";
import { ResponsiveArtPicture } from "@/components/storefront/ResponsiveArtPicture";
import type { HeroImage } from "@/db/schema";

const SLIDE_DURATION_MS = 5000;

interface HeroCarouselProps {
  images: HeroImage[];
}

export function HeroCarousel({ images }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0);

  const goTo = useCallback(
    (index: number) => {
      const next = (index + images.length) % images.length;
      setCurrentIndex(next);
      setProgressKey((k) => k + 1);
    },
    [images.length]
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(goNext, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [images.length, currentIndex, goNext]);

  if (images.length === 0) return null;

  const current = images[currentIndex];

  return (
    <section className="w-full relative overflow-hidden">
      {/* Responsive height: min 50vh on mobile, 75vh on larger screens */}
      <div className="w-full min-h-[50vh] sm:min-h-[60vh] md:h-[75vh] relative">
        <ResponsiveArtPicture
          key={`${current.id}-${currentIndex}`}
          desktopSrc={current.imageUrl}
          mobileSrc={current.mobileImageUrl}
          alt={current.altText ?? "Hero slide"}
          className="absolute inset-0 block h-full w-full"
          imgClassName="h-full w-full object-cover"
          fetchPriority={currentIndex === 0 ? "high" : undefined}
        />

        {/* Progress bar at bottom - only when multiple slides */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-foreground/20">
            <div
              key={progressKey}
              className="hero-progress-bar h-full bg-foreground"
            />
          </div>
        )}

        {/* Navigation arrows - only when multiple slides */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-foreground/20 hover:bg-foreground/40 text-foreground transition-colors"
              aria-label="Previous slide"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-foreground/20 hover:bg-foreground/40 text-foreground transition-colors"
              aria-label="Next slide"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Dots - above progress bar */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`w-2 h-2 transition-colors ${i === currentIndex ? "bg-foreground" : "bg-foreground/40 hover:bg-foreground/60"
                    }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
