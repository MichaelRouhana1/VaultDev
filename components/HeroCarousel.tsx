"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ResponsiveArtPicture } from "@/components/storefront/ResponsiveArtPicture";
import type { HeroImage } from "@/db/schema";
import { cn } from "@/lib/utils";

const SLIDE_DURATION_MS = 5000;
const DRAG_THRESHOLD_PX = 56;
/** Max drag vs viewport width (peek neighboring slide) */
const DRAG_CLAMP_RATIO = 0.78;

/**
 * First slide: drag left = 1:1 up to maxPull; drag right (no prev) uses √ so motion keeps growing but “fights back”.
 * Last slide: symmetric for drag left into “no next”.
 */
function dragWithResistance(raw: number, viewportWidth: number, index: number, count: number): number {
  const w = viewportWidth;
  const maxPull = w * DRAG_CLAMP_RATIO;
  const k = 0.13 * Math.sqrt(Math.max(w, 280));

  if (count <= 1) return 0;

  if (index === 0) {
    if (raw <= 0) return Math.max(-maxPull, raw);
    return k * Math.sqrt(raw);
  }
  if (index === count - 1) {
    if (raw >= 0) return Math.min(maxPull, raw);
    return -k * Math.sqrt(-raw);
  }

  return Math.max(-maxPull, Math.min(maxPull, raw));
}

interface HeroCarouselProps {
  images: HeroImage[];
}

export function HeroCarousel({ images }: HeroCarouselProps) {
  const n = images.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ id: number; startX: number } | null>(null);

  const goTo = useCallback(
    (index: number) => {
      const next = (index + n) % n;
      setCurrentIndex(next);
      setProgressKey((k) => k + 1);
    },
    [n],
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  useEffect(() => {
    if (n <= 1) return;
    const timer = setInterval(goNext, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [n, currentIndex, goNext]);

  const finishDrag = useCallback(
    (clientX: number) => {
      const start = pointerRef.current;
      pointerRef.current = null;
      setIsDragging(false);

      if (!start) {
        setDragX(0);
        return;
      }

      const dx = clientX - start.startX;
      setDragX(0);

      if (dx > DRAG_THRESHOLD_PX && currentIndex > 0) {
        goPrev();
      } else if (dx < -DRAG_THRESHOLD_PX && currentIndex < n - 1) {
        goNext();
      } else {
        setProgressKey((k) => k + 1);
      }
    },
    [goNext, goPrev, currentIndex, n],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (n <= 1) return;
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      pointerRef.current = { id: e.pointerId, startX: e.clientX };
      setIsDragging(true);
      setDragX(0);
    },
    [n],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const p = pointerRef.current;
      if (!p || e.pointerId !== p.id) return;
      const w = viewportRef.current?.offsetWidth ?? 400;
      const raw = e.clientX - p.startX;
      setDragX(dragWithResistance(raw, w, currentIndex, n));
    },
    [currentIndex, n],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const p = pointerRef.current;
      if (!p || e.pointerId !== p.id) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* */
      }
      finishDrag(e.clientX);
    },
    [finishDrag],
  );

  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointerRef.current;
    if (!p || e.pointerId !== p.id) return;
    pointerRef.current = null;
    setIsDragging(false);
    setDragX(0);
    setProgressKey((k) => k + 1);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (n <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentIndex > 0) goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (currentIndex < n - 1) goNext();
      }
    },
    [n, goNext, goPrev, currentIndex],
  );

  if (n === 0) return null;

  const slideFractionPct = n > 0 ? (100 * currentIndex) / n : 0;
  const trackTransform =
    n > 1
      ? `translateX(calc(-${slideFractionPct}% + ${dragX}px))`
      : undefined;

  return (
    <section className="w-full relative overflow-hidden">
      <div
        ref={viewportRef}
        className="w-full min-h-[52vh] sm:min-h-[62vh] md:h-[78vh] relative"
        role="region"
        aria-roledescription="carousel"
        aria-label="Hero slideshow"
        tabIndex={n > 1 ? 0 : undefined}
        onKeyDown={onKeyDown}
      >
        <div
          className={cn(
            "absolute inset-0 z-0 overflow-hidden select-none touch-none",
            n > 1 && "cursor-grab active:cursor-grabbing",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div
            className={cn(
              "flex h-full",
              !isDragging && n > 1 && "transition-transform duration-300 ease-out",
            )}
            style={{
              width: n > 1 ? `${n * 100}%` : "100%",
              transform: trackTransform ?? undefined,
            }}
          >
            {images.map((img, i) => (
              <div
                key={img.id}
                className="relative h-full shrink-0"
                style={{ width: n > 1 ? `${100 / n}%` : "100%" }}
              >
                <ResponsiveArtPicture
                  desktopSrc={img.imageUrl}
                  mobileSrc={img.mobileImageUrl}
                  alt={img.altText ?? "Hero slide"}
                  className="pointer-events-none block h-full w-full"
                  imgClassName="h-full w-full object-cover pointer-events-none"
                  fetchPriority={i === 0 ? "high" : undefined}
                />
              </div>
            ))}
          </div>
        </div>

        {n > 1 && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-1 bg-foreground/20">
            <div key={progressKey} className="hero-progress-bar pointer-events-none h-full bg-foreground" />
          </div>
        )}

        {n > 1 && (
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={`pointer-events-auto h-2 w-2 transition-colors ${
                  i === currentIndex ? "bg-foreground" : "bg-foreground/40 hover:bg-foreground/60"
                }`}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === currentIndex ? "true" : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
