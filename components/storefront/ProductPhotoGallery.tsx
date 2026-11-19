"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import AutoScroll from "embla-carousel-auto-scroll";
import { Maximize, Minimize, Minus, Pause, Play, Plus } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { ProductImage } from "@/components/storefront/ProductImage";
import { ProgressiveZoomPhoto, useProductZoomGesture, type ProductZoomSession } from "@/components/storefront/ProgressiveZoomPhoto";
import { cn } from "@/lib/utils";

export type ProductPhoto = { src: string; index: number };

const STRIP_SIZES = "max(350px, calc((100svh - 56px) * .78), 20vw)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const photoControl =
  "inline-flex size-10 items-center justify-center border border-border bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40 motion-reduce:transition-none";
const photoSwipeDistance = 72;

function photoOverflows(element: HTMLElement) {
  return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1;
}

export function ProductPhotoStrip({
  photos,
  name,
  onExpand,
  onImageError,
}: {
  photos: ProductPhoto[];
  name: string;
  onExpand: (index: number, trigger: HTMLButtonElement) => void;
  onImageError: (index: number) => void;
}) {
  const t = useTranslations("ProductDetail");
  const [api, setApi] = useState<CarouselApi>();
  const [playing, setPlaying] = useState(false);
  const [playPreference, setPlayPreference] = useState<boolean | null>(null);
  const multiple = photos.length > 1;
  const plugins = useMemo(() => [AutoScroll({ playOnInit: false, startDelay: 750 })], []);
  const opts = useMemo(() => ({
    align: "start" as const,
    loop: multiple,
    breakpoints: { [REDUCED_MOTION]: { duration: 0 } },
  }), [multiple]);

  useEffect(() => {
    if (!api || !multiple) return;
    const motion = window.matchMedia(REDUCED_MOTION);
    const syncPlayback = () => {
      const autoplay = (playPreference ?? !motion.matches) && api.scrollSnapList().length > 1;
      setPlaying(autoplay);
      if (autoplay) api.plugins().autoScroll?.play();
      else api.plugins().autoScroll?.stop();
    };
    syncPlayback();
    api.on("reInit", syncPlayback).on("pointerUp", syncPlayback);
    motion.addEventListener("change", syncPlayback);
    return () => {
      api.off("reInit", syncPlayback).off("pointerUp", syncPlayback);
      motion.removeEventListener("change", syncPlayback);
      api.plugins().autoScroll?.stop();
    };
  }, [api, multiple, playPreference]);

  if (photos.length === 0) {
    return (
      <div className="grid h-full place-items-center bg-muted text-sm text-muted-foreground">
        {t("noImage")}
      </div>
    );
  }

  // The loop needs enough slides to cover the viewport, including its partial tile.
  const copies = multiple ? Math.ceil(7 / photos.length) : 1;
  const slides = Array.from({ length: copies }, () => photos).flat();
  const first = photos[0];

  return (
    <Carousel
      aria-label={t("galleryAria")}
      role="region"
      setApi={setApi}
      opts={opts}
      plugins={plugins}
      tabIndex={multiple ? 0 : undefined}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !api) return;
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        api.plugins().autoScroll?.stop();
        if (event.key === "ArrowLeft") api.scrollPrev();
        else api.scrollNext();
        if (playing) api.plugins().autoScroll?.play();
      }}
      className="h-full bg-muted"
      viewportClassName={cn("h-full", multiple && "cursor-grab active:cursor-grabbing")}
    >
      <CarouselContent className="h-full touch-pan-y">
        {slides.map(({ src, index }, position) => (
          <CarouselItem
            key={`${position}:${index}`}
            className={cn("relative h-full", multiple ? "basis-[var(--pdp-photo-width)]" : "basis-full")}
            aria-hidden={position >= photos.length || undefined}
          >
            <ProductImage
              variant="pdp"
              fetchPriority={position === 0 ? "high" : undefined}
              src={src}
              data-gallery-photo={src}
              alt={position < photos.length ? t("thumbAlt", { index: index + 1, name }) : ""}
              fill
              draggable={false}
              className={cn("pointer-events-none select-none", multiple ? "max-w-none w-[calc(100%+1px)]! object-cover" : "object-contain object-left")}
              sizes={STRIP_SIZES}
              onError={() => onImageError(index)}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3 lg:bottom-10">
        <button
          type="button"
          className={cn(photoControl, "size-8 border-0 shadow-none")}
          onClick={(event) => onExpand(first.index, event.currentTarget)}
          aria-label={t("zoomIn")}
          title={t("zoomIn")}
        >
          <Maximize className="size-4" aria-hidden />
        </button>
        {multiple && (
          <button
            type="button"
            className={cn(photoControl, "size-8 border-0 shadow-none")}
            onClick={() => setPlayPreference(!playing)}
            aria-label={t(playing ? "pauseGallery" : "playGallery")}
            title={t(playing ? "pauseGallery" : "playGallery")}
          >
            {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          </button>
        )}
      </div>
    </Carousel>
  );
}

export function ProductPhotoViewer({
  photos,
  name,
  startIndex,
  session,
  onClose,
  restoreFocus,
}: {
  photos: ProductPhoto[];
  name: string;
  startIndex: number;
  session: ProductZoomSession;
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const t = useTranslations("ProductDetail");
  const tCommon = useTranslations("Common");
  const initial = Math.max(0, photos.findIndex(({ index }) => index === startIndex));
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(initial);
  const [visited, setVisited] = useState(() => new Set([initial]));
  const [scale, setScale] = useState(1);
  const [panning, setPanning] = useState(false);
  const { pinching, resetGesture, touchHandlers } = useProductZoomGesture(scale, setScale);
  const slides = useRef<Array<HTMLDivElement | null>>([]);
  const scaleRef = useRef(scale);
  const selectedRef = useRef(selected);
  const apiRef = useRef(api);
  const stopPan = useRef<(() => void) | null>(null);
  scaleRef.current = scale;
  selectedRef.current = selected;
  apiRef.current = api;
  // Embla turns every mouse drag into a slide change, including a vertical one.
  // A cropped or zoomed photo takes the pointer and pans instead.
  const opts = useMemo(() => ({
    startIndex: initial,
    watchDrag: (_emblaApi: unknown, event: MouseEvent | TouchEvent) => {
      if ("touches" in event) return scaleRef.current <= 1;
      if (scaleRef.current > 1) return false;
      const slide = slides.current[selectedRef.current];
      return !slide || !photoOverflows(slide);
    },
    breakpoints: { [REDUCED_MOTION]: { duration: 0 } },
  }), [initial]);

  useEffect(() => () => stopPan.current?.(), []);

  useEffect(() => {
    if (!panning) return;
    const root = document.documentElement;
    const previous = root.style.cursor;
    root.style.cursor = "grabbing";
    return () => {
      root.style.cursor = previous;
    };
  }, [panning]);

  const onPhotoPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.pointerType === "touch") return;
    const el = event.currentTarget;
    const zoomed = scaleRef.current > 1;
    if (!zoomed && !photoOverflows(el)) return;

    event.preventDefault();
    event.stopPropagation();
    stopPan.current?.();

    const drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
      axis: null as "x" | "y" | null,
      zoomed,
    };
    setPanning(true);

    const move = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      e.preventDefault();
      if (drag.zoomed) {
        el.scrollLeft = drag.left - dx;
        el.scrollTop = drag.top - dy;
        return;
      }
      if (!drag.axis) {
        if (Math.hypot(dx, dy) < 4) return;
        drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (drag.axis === "y") el.scrollTop = drag.top - dy;
      else if (el.scrollWidth > el.clientWidth + 1) el.scrollLeft = drag.left - dx;
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      if (stopPan.current === stop) stopPan.current = null;
      setPanning(false);
      if (el.hasPointerCapture?.(drag.pointerId)) el.releasePointerCapture(drag.pointerId);
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.x;
      stop();
      if (drag.zoomed || drag.axis !== "x" || el.scrollWidth > el.clientWidth + 1) return;
      if (Math.abs(dx) < photoSwipeDistance) return;
      const rtl = getComputedStyle(el).direction === "rtl";
      const next = rtl ? dx > 0 : dx < 0;
      if (next) apiRef.current?.scrollNext();
      else apiRef.current?.scrollPrev();
    };
    stopPan.current = stop;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    try {
      el.setPointerCapture(event.pointerId);
    } catch {
      // Window listeners still follow the gesture when capture is unavailable.
    }
  };

  useEffect(() => {
    if (!api) return;
    const select = () => {
      const next = api.selectedScrollSnap();
      setSelected(next);
      setVisited((previous) => previous.has(next) ? previous : new Set(previous).add(next));
      slides.current[next]?.scrollTo(0, 0);
    };
    const changePhoto = () => {
      resetGesture();
      setScale(1);
      select();
    };
    api.on("select", changePhoto).on("reInit", select);
    return () => {
      api.off("select", changePhoto).off("reInit", select);
    };
  }, [api, resetGesture]);

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[79] bg-background" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[80] overflow-hidden bg-background outline-none"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") api?.scrollNext();
            else if (event.key === "ArrowLeft") api?.scrollPrev();
            else return;
            event.preventDefault();
          }}
        >
          <Dialog.Title className="sr-only">{t("galleryAria")}</Dialog.Title>
          <Dialog.Close
            className={cn(photoControl, "absolute end-4 top-[max(1rem,env(safe-area-inset-top))] z-10 md:end-8")}
            aria-label={tCommon("close")}
            title={tCommon("close")}
          >
            <Minimize className="size-5" aria-hidden />
          </Dialog.Close>
          <button
            type="button"
            className={cn(photoControl, "absolute end-16 top-[max(1rem,env(safe-area-inset-top))] z-10 md:end-20")}
            aria-label={t(scale > 1 ? "zoomOut" : "zoomIn")}
            onClick={() => {
              if (scale > 1) slides.current[selected]?.scrollTo(0, 0);
              setScale(scale > 1 ? 1 : 2);
            }}
          >
            {scale > 1 ? <Minus className="size-5" aria-hidden /> : <Plus className="size-5" aria-hidden />}
          </button>
          <Carousel setApi={setApi} opts={opts} className="h-full" viewportClassName="h-full">
            <CarouselContent className={cn("h-full", scale === 1 && "touch-pan-y")}>
              {photos.map(({ src, index }, position) => {
                const active = position === selected;
                return (
                  <CarouselItem key={index} className="h-full basis-full" aria-hidden={!active}>
                    <div
                      ref={(element) => { slides.current[position] = element; }}
                      tabIndex={active ? 0 : undefined}
                      className={cn(
                        "h-full overflow-auto overscroll-contain bg-muted select-none [touch-action:pan-x_pan-y] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring",
                        active && (panning ? "cursor-grabbing" : "cursor-grab"),
                      )}
                      {...(active ? touchHandlers : {})}
                      onTouchStartCapture={(event) => {
                        if (!active) return;
                        if (scale > 1 && event.touches.length === 1) event.stopPropagation();
                        else touchHandlers.onTouchStartCapture(event);
                      }}
                      onPointerDownCapture={active ? onPhotoPointerDown : undefined}
                    >
                      {(active || visited.has(position) || session.photos.has(src)) && (
                        <ProgressiveZoomPhoto
                          src={src}
                          alt={t("zoomedAlt", { index: index + 1, name })}
                          session={session}
                          active={active}
                          scale={active ? scale : 1}
                          pinching={pinching}
                          previous={photos[position - 1]?.src}
                          next={photos[position + 1]?.src}
                          noImage={t("noImage")}
                        />
                      )}
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {photos.length > 1 && (
              <div className="scrollbar-hide absolute bottom-[max(1rem,env(safe-area-inset-bottom))] start-4 flex max-h-[70%] max-w-[calc(100%-2rem)] gap-1 overflow-auto bg-background/85 p-1 backdrop-blur-sm md:flex-col">
                {photos.map(({ src, index }, position) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => api?.scrollTo(position)}
                    className={cn(
                      "relative aspect-[3/4] w-11 shrink-0 overflow-hidden border bg-muted focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring md:w-12",
                      position === selected ? "border-foreground opacity-100" : "border-transparent opacity-70 hover:opacity-100",
                    )}
                    aria-label={t("thumbAlt", { index: index + 1, name })}
                    aria-pressed={position === selected}
                  >
                    <ProductImage variant="thumbnail" src={src} alt="" fill sizes="48px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </Carousel>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
