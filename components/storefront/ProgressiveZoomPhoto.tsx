"use client";

import { useCallback, useLayoutEffect, useRef, useState, type TouchEvent } from "react";
import { cfImage, IMAGE_TRANSFORM_BASE, productImageSource } from "@/lib/cf-image";
import { cn } from "@/lib/utils";

type LoadedPhoto = { url: string; width: number; ratio: number; sourceLimited?: boolean };
type Connection = EventTarget & { effectiveType?: string; saveData?: boolean };

const zoomTiers = [2400, 3200, 4000] as const;
const upgradeDelay = 180;

function zoomUrl(src: string, width: number) {
  const url = cfImage(productImageSource(src), { width, fallback: false });
  return url.startsWith(IMAGE_TRANSFORM_BASE) && url !== src ? url : null;
}

function transformedWidth(url: string) {
  return url.startsWith(IMAGE_TRANSFORM_BASE)
    ? Number(/\/cdn-cgi\/image\/width=(\d+),/.exec(url)?.[1] ?? 0)
    : 0;
}

async function decodePhoto(url: string, priority: "low" | "high"): Promise<LoadedPhoto | null> {
  try {
    const image = new Image();
    image.fetchPriority = priority;
    image.src = url;
    await image.decode();
    return {
      url,
      width: image.naturalWidth,
      ratio: image.naturalWidth / image.naturalHeight,
      sourceLimited: image.naturalWidth < transformedWidth(url),
    };
  } catch {
    console.debug("Product zoom image could not be decoded", url);
    return null;
  }
}

export function createProductZoomSession() {
  return {
    photos: new Map<string, LoadedPhoto>(),
    requests: new Map<string, Promise<LoadedPhoto | null>>(),
  };
}

export type ProductZoomSession = ReturnType<typeof createProductZoomSession>;

// Snapshot currentSrc so opening the viewer reuses the browser's gallery candidate.
export function useOpenProductZoom(galleryKey: string) {
  const request = useRef(0);
  useLayoutEffect(() => () => { request.current += 1; }, [galleryKey]);

  return (src: string, onReady: (session: ProductZoomSession) => void) => {
    const id = ++request.current;
    const session = createProductZoomSession();
    for (const image of document.querySelectorAll<HTMLImageElement>("img[data-gallery-photo]")) {
      const source = image.dataset.galleryPhoto;
      if (!source || !image.complete || !image.naturalWidth || !image.currentSrc) continue;
      // A width-descriptor srcset density-corrects naturalWidth, so use the selected tier.
      const width = transformedWidth(image.currentSrc) || image.naturalWidth;
      if ((session.photos.get(source)?.width ?? 0) >= width) continue;
      session.photos.set(source, { url: image.currentSrc, width, ratio: image.naturalWidth / image.naturalHeight });
    }
    if (session.photos.has(src)) {
      onReady(session);
      return;
    }

    // An early click can beat the gallery request. Decode a base photo before opening.
    void decodePhoto(zoomUrl(src, 1200) ?? src, "high").then((photo) => {
      if (!photo || request.current !== id) return;
      session.photos.set(src, photo);
      onReady(session);
    });
  };
}

function loadTier(session: ProductZoomSession, src: string, tier: number, priority: "low" | "high") {
  const url = zoomUrl(src, tier);
  if (!url) return Promise.resolve(null);
  const pending = session.requests.get(url);
  if (pending) return pending;
  const request = decodePhoto(url, priority).then((photo) => {
    if (photo && photo.width > (session.photos.get(src)?.width ?? 0)) session.photos.set(src, photo);
    return photo;
  });
  session.requests.set(url, request);
  return request;
}

export function useProductZoomGesture(scale: number, setScale: (scale: number) => void) {
  const start = useRef<{ distance: number; scale: number } | null>(null);
  const [pinching, setPinching] = useState(false);
  const distance = (event: TouchEvent) => {
    const [a, b] = Array.from(event.touches);
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  };
  const resetGesture = useCallback(() => {
    start.current = null;
    setPinching(false);
  }, []);
  const end = (event: TouchEvent) => {
    if (!start.current || event.touches.length >= 2) return;
    event.stopPropagation();
    resetGesture();
  };

  return {
    pinching,
    resetGesture,
    touchHandlers: {
      onTouchStartCapture: (event: TouchEvent) => {
        if (event.touches.length !== 2) return;
        event.stopPropagation();
        const initialDistance = distance(event);
        if (initialDistance === 0) return;
        start.current = { distance: initialDistance, scale };
        setPinching(true);
      },
      onTouchMoveCapture: (event: TouchEvent) => {
        if (!start.current || event.touches.length < 2) return;
        event.stopPropagation();
        setScale(Math.max(1, Math.min(4, start.current.scale * distance(event) / start.current.distance)));
      },
      onTouchEndCapture: end,
      onTouchCancelCapture: resetGesture,
    },
  };
}

export function ProgressiveZoomPhoto({
  src, alt, session, active, scale, pinching, previous, next, fitHeight, noImage, className,
}: {
  src: string;
  alt: string;
  session: ProductZoomSession;
  active: boolean;
  scale: number;
  pinching: boolean;
  previous?: string;
  next?: string;
  fitHeight?: number;
  noImage: string;
  className?: string;
}) {
  const [base, setBase] = useState(() => session.photos.get(src));
  const [upgrade, setUpgrade] = useState<LoadedPhoto>();
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const displayed = upgrade ?? base;
  const baseUrl = base?.url ?? zoomUrl(src, 1200) ?? src;
  const width = displayed?.width ?? 0;
  const sourceLimited = displayed?.sourceLimited;

  useLayoutEffect(() => {
    const image = imageRef.current;
    if (!active || pinching || !image || !width || !zoomUrl(src, zoomTiers[0])) return;
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    let revision = 0;
    let timer: number;

    const schedule = () => {
      window.clearTimeout(timer);
      const current = ++revision;
      timer = window.setTimeout(async () => {
        const effectiveType = connection?.effectiveType;
        const slow = connection?.saveData || effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g";
        // The image element's width already includes the current zoom scale.
        const pixels = image.getBoundingClientRect().width * window.devicePixelRatio;
        if (!pixels) return;
        const desktop = window.matchMedia("(min-width: 768px)").matches;
        // Height-fitted portraits can remain narrower than the gallery candidate even
        // at 2x zoom. Give desktop fullscreen a 2400px floor and budget for the
        // viewport at the current scale rather than treating that fit as sufficient.
        const requiredPixels = desktop
          ? Math.max(zoomTiers[0], pixels, window.innerWidth * window.devicePixelRatio * scale)
          : pixels;
        const tier = slow && !desktop
          ? zoomTiers[0]
          : zoomTiers.find((candidate) => candidate >= requiredPixels) ?? zoomTiers[2];
        if (!sourceLimited && tier > width && (desktop || pixels > width)) {
          const photo = await loadTier(session, src, tier, "high");
          if (current !== revision || !photo) return;
          if (photo.width > width) setUpgrade(photo);
        }
        if (current === revision && connection?.effectiveType === "4g" && connection.saveData === false) {
          for (const neighbor of new Set([previous, next])) {
            if (!neighbor || neighbor === src) continue;
            const cached = session.photos.get(neighbor);
            if (!cached?.sourceLimited && (cached?.width ?? 0) < tier) {
              void loadTier(session, neighbor, tier, "low");
            }
          }
        }
      }, upgradeDelay);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(image);
    window.addEventListener("resize", schedule);
    connection?.addEventListener("change", schedule);
    schedule();
    return () => {
      revision += 1;
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      connection?.removeEventListener("change", schedule);
    };
  }, [active, failed, next, pinching, previous, scale, session, sourceLimited, src, width]);

  if (failed) {
    return <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">{noImage}</div>;
  }

  const ratio = base?.ratio ?? 0.78;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Reuse the selected gallery URL and swap decoded CDN tiers.
    <img
      ref={imageRef}
      src={displayed?.url ?? baseUrl}
      alt={alt}
      draggable={false}
      decoding="sync"
      className={cn("block h-auto max-w-none shrink-0 select-none", className)}
      style={{
        aspectRatio: ratio,
        width: fitHeight ? `min(${scale * 100}%, ${fitHeight * ratio * scale}vh)` : `${scale * 100}%`,
      }}
      onLoad={(event) => {
        if (upgrade) return;
        const { currentSrc, naturalWidth, naturalHeight } = event.currentTarget;
        if (base?.width === naturalWidth) return;
        const photo = {
          url: currentSrc,
          width: naturalWidth,
          ratio: base?.ratio ?? naturalWidth / naturalHeight,
          sourceLimited: naturalWidth < transformedWidth(currentSrc),
        };
        const cached = session.photos.get(src);
        if (!cached || cached.url === currentSrc || cached.width < naturalWidth) session.photos.set(src, photo);
        setBase(photo);
      }}
      onError={() => {
        if (upgrade) {
          session.requests.set(upgrade.url, Promise.resolve(null));
          if (base && session.photos.get(src)?.url === upgrade.url) session.photos.set(src, base);
          setUpgrade(undefined);
        } else setFailed(true);
      }}
    />
  );
}
