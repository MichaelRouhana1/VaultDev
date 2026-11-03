"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ResponsiveArtPicture } from "@/components/storefront/ResponsiveArtPicture";
import { usePathname } from "@/i18n/navigation";
import { GATE_EXPAND_MS, GATE_REDUCED_MS, GATE_REVEAL_MS } from "@/lib/store-gate-motion";
import { normalizePathname } from "@/lib/store-nav";

export type GateHandoffImage = { desktopSrc: string; mobileSrc?: string | null };

type StyleHandoff = {
  kind: "style";
  id: number;
  origin: string;
  chosen: "streetwear" | "formal";
  streetwear: GateHandoffImage;
  formal: GateHandoffImage;
  labels: { streetwear: string; formal: string; enter: string; subtitle: string; back: string };
  alts: { streetwear: string; formal: string };
};

type CoverHandoff = {
  kind: "cover";
  id: number;
  origin: string;
  chosen: "women" | "streetwear" | "formal";
  image: GateHandoffImage;
  alt: string;
};

export type GateHandoff = StyleHandoff | CoverHandoff;

let current: GateHandoff | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function publish(next: GateHandoff) {
  current = next;
  emit();
}

export function startStyleHandoff(input: Omit<StyleHandoff, "kind" | "id">) {
  publish({ ...input, kind: "style", id: nextId++ });
}

export function startCoverHandoff(input: Omit<CoverHandoff, "kind" | "id">) {
  publish({ ...input, kind: "cover", id: nextId++ });
}

export function clearGateHandoff() {
  if (!current) return;
  current = null;
  emit();
}

function subscribeHandoff(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGateHandoff(): GateHandoff | null {
  return useSyncExternalStore(subscribeHandoff, () => current, () => null);
}

function motionMs(expand: boolean): number {
  if (typeof window === "undefined") return expand ? GATE_EXPAND_MS : GATE_REVEAL_MS;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return GATE_REDUCED_MS;
  return expand ? GATE_EXPAND_MS : GATE_REVEAL_MS;
}

const PANEL_SHADE = "absolute inset-0 bg-black/40";

function StylePanel({
  panel,
  image,
  alt,
  title,
  enter,
  titleClass,
  ctaClass,
}: {
  panel: "streetwear" | "formal";
  image: GateHandoffImage;
  alt: string;
  title: string;
  enter: string;
  titleClass: string;
  ctaClass: string;
}) {
  return (
    <div
      data-panel={panel}
      className="gate-style-panel relative flex h-full w-full flex-1 flex-col items-center justify-center"
    >
      <ResponsiveArtPicture
        desktopSrc={image.desktopSrc}
        mobileSrc={image.mobileSrc}
        alt={alt}
        className="absolute inset-0 block h-full w-full"
        imgClassName="h-full w-full object-cover object-top"
      />
      <div className={PANEL_SHADE} />
      <div className="gate-style-copy relative z-10 flex flex-col items-center p-8 text-center">
        <h2 className={titleClass}>{title}</h2>
        <span className={ctaClass}>{enter}</span>
      </div>
    </div>
  );
}

/**
 * Survives the storefront layout so a Streetwear / Classic click can expand immediately
 * while the next route paints underneath, then reveals that page with the same center wipe
 * used when Men opens the style step.
 */
export function GateHandoffLayer({ children }: { children: ReactNode }) {
  const handoff = useGateHandoff();
  const pathname = usePathname();
  const [motion, setMotion] = useState({ id: 0, expandOn: false, expandDone: false });
  const seenTarget = useRef(false);

  const onTarget = handoff != null && normalizePathname(pathname) === `/${handoff.chosen}`;
  const expandOn =
    handoff?.kind === "cover" || (handoff != null && motion.id === handoff.id && motion.expandOn);
  const expandDone =
    handoff?.kind === "cover" || (handoff != null && motion.id === handoff.id && motion.expandDone);
  const revealing = expandDone && onTarget;

  useEffect(() => {
    if (!handoff || handoff.kind !== "style") return;
    const expandMs = motionMs(true);
    let raf2 = 0;
    let timer = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setMotion({ id: handoff.id, expandOn: true, expandDone: false });
        timer = window.setTimeout(() => {
          setMotion({ id: handoff.id, expandOn: true, expandDone: true });
        }, expandMs);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
  }, [handoff]);

  useEffect(() => {
    if (!revealing) return;
    const id = window.setTimeout(() => clearGateHandoff(), motionMs(false));
    return () => window.clearTimeout(id);
  }, [revealing]);

  useEffect(() => {
    if (!handoff) {
      seenTarget.current = false;
      return;
    }
    const path = normalizePathname(pathname);
    if (!path) return;
    if (path === `/${handoff.chosen}`) {
      seenTarget.current = true;
      return;
    }
    if (seenTarget.current || path !== handoff.origin) clearGateHandoff();
  }, [handoff, pathname]);

  useEffect(() => {
    if (!handoff) return;
    const id = window.setTimeout(() => clearGateHandoff(), 12000);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = previous;
    };
  }, [handoff]);

  useEffect(() => {
    if (!revealing) return;
    window.scrollTo(0, 0);
  }, [revealing]);

  return (
    <>
      <div className={revealing ? "gate-page-reveal" : undefined} inert={handoff != null && !revealing}>
        {children}
      </div>
      {handoff?.kind === "style" ? (
        <div
          className="store-gate gate-handoff overflow-hidden bg-black text-white"
          data-phase="style"
          data-style-open=""
          data-leaving={expandOn ? handoff.chosen : undefined}
          aria-hidden
        >
          <div className="gate-brand pointer-events-none absolute start-1/2 top-8 z-50 flex -translate-x-1/2 flex-col items-center text-white mix-blend-difference drop-shadow-lg rtl:translate-x-1/2">
            <p className="text-2xl font-light uppercase tracking-[0.4em] md:text-3xl">VAULT</p>
            <p className="mt-2 text-xs font-light uppercase tracking-[0.2em] opacity-80 md:text-sm">
              {handoff.labels.subtitle}
            </p>
          </div>
          <div className="gate-back absolute start-4 top-8 z-50 flex items-center gap-2 p-2 text-[10px] font-light uppercase tracking-[0.25em] text-white mix-blend-difference md:start-8 md:text-xs">
            <svg className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {handoff.labels.back}
          </div>
          <div className="gate-layer gate-style absolute inset-0 z-30 flex flex-col md:flex-row">
            <StylePanel
              panel="streetwear"
              image={handoff.streetwear}
              alt={handoff.alts.streetwear}
              title={handoff.labels.streetwear}
              enter={handoff.labels.enter}
              titleClass="mb-4 text-4xl font-black uppercase tracking-widest drop-shadow-xl md:text-6xl"
              ctaClass="border-b-2 border-white pb-1 text-sm font-bold uppercase tracking-[0.2em] md:text-base"
            />
            <StylePanel
              panel="formal"
              image={handoff.formal}
              alt={handoff.alts.formal}
              title={handoff.labels.formal}
              enter={handoff.labels.enter}
              titleClass="mb-4 text-4xl font-light uppercase tracking-[0.2em] drop-shadow-xl md:text-6xl"
              ctaClass="border-b border-white pb-1 text-sm font-light uppercase tracking-[0.2em] md:text-base"
            />
          </div>
        </div>
      ) : null}
      {handoff?.kind === "cover" ? (
        <div className="gate-handoff overflow-hidden bg-black" aria-hidden>
          <ResponsiveArtPicture
            desktopSrc={handoff.image.desktopSrc}
            mobileSrc={handoff.image.mobileSrc}
            alt=""
            className="absolute inset-0 block h-full w-full"
            imgClassName="h-full w-full object-cover object-top scale-[1.04]"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      ) : null}
    </>
  );
}
