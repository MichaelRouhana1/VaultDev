"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { startCoverHandoff, startStyleHandoff, useGateHandoff } from "@/components/storefront/GateHandoffLayer";
import { ResponsiveArtPicture } from "@/components/storefront/ResponsiveArtPicture";
import { normalizePathname } from "@/lib/store-nav";
import { PREFERRED_STORE_COOKIE } from "@/lib/preferred-store";
import { GATE_EXPAND_MS, GATE_REDUCED_MS, GATE_REVEAL_MS } from "@/lib/store-gate-motion";

export type StoreGateImage = { desktopSrc: string; mobileSrc?: string | null };

export interface StoreGateProps {
  initialStep: "gender" | "style";
  images: {
    men: StoreGateImage;
    women: StoreGateImage;
    streetwear: StoreGateImage;
    formal: StoreGateImage;
  };
}

/**
 * gender → (Men) men-expand → style-reveal → style ; style → style-hide → gender
 * gender → (Women) women-expand → cover handoff → /women
 * style → (Streetwear / Classic) style handoff expands immediately, store home reveals under it
 */
type Phase =
  | "gender"
  | "men-expand"
  | "style-reveal"
  | "style"
  | "style-hide"
  | "women-expand"
  | "streetwear-leave"
  | "formal-leave";
/** Marks history entries pushed by the gate so Back can pop instead of pushing a new entry. */
const GATE_HISTORY_KEY = "mosaikStoreGate";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isModifiedClick(e: MouseEvent): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

const PANEL_IMG =
  "h-full w-full object-cover object-top transition-transform duration-[2s] ease-out md:group-hover:scale-105";
const PANEL_SHADE = "absolute inset-0 bg-black/40 transition-colors duration-[800ms] group-hover:bg-black/20";
const PANEL_CTA_BOLD =
  "transform border-b-2 border-white pb-1 text-sm font-bold uppercase tracking-[0.2em] opacity-100 transition-all duration-[800ms] ease-out md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:text-base";
const PANEL_CTA_LIGHT =
  "transform border-b border-white pb-1 text-sm font-light uppercase tracking-[0.2em] opacity-100 transition-all duration-[800ms] ease-out md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:text-base";

export function StoreGate({ initialStep, images }: StoreGateProps) {
  const t = useTranslations("Landing");
  const locale = useLocale();
  const pathname = normalizePathname(usePathname());
  const router = useRouter();
  const handoff = useGateHandoff();
  const [phase, setPhase] = useState<Phase>(initialStep === "style" ? "style" : "gender");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const timers = useRef<number[]>([]);
  const firstStyleLinkRef = useRef<HTMLAnchorElement>(null);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const openStyle = useCallback(() => {
    clearTimers();
    const reduced = prefersReducedMotion();
    setPhase("men-expand");
    schedule(() => {
      setPhase("style-reveal");
      schedule(() => {
        setPhase("style");
        firstStyleLinkRef.current?.focus({ preventScroll: true });
      }, reduced ? GATE_REDUCED_MS : GATE_REVEAL_MS);
    }, reduced ? GATE_REDUCED_MS : GATE_EXPAND_MS);
  }, [clearTimers, schedule]);

  const closeStyle = useCallback(() => {
    clearTimers();
    setPhase("style-hide");
    schedule(() => setPhase("gender"), prefersReducedMotion() ? GATE_REDUCED_MS : GATE_REVEAL_MS);
  }, [clearTimers, schedule]);

  useEffect(() => clearTimers, [clearTimers]);

  /** If the store route never commits, return the style choices instead of leaving them inert. */
  useEffect(() => {
    if (handoff) return;
    if (phaseRef.current === "streetwear-leave" || phaseRef.current === "formal-leave") setPhase("style");
  }, [handoff]);

  useEffect(() => {
    router.prefetch("/women");
    router.prefetch("/streetwear");
    router.prefetch("/formal");
  }, [router]);

  /** URL is the source of truth for the step, so browser Back / Forward replay the transition. */
  useEffect(() => {
    const p = phaseRef.current;
    if (pathname === "/men" && (p === "gender" || p === "style-hide")) openStyle();
    else if (pathname === "/" && (p === "style" || p === "style-reveal" || p === "men-expand")) closeStyle();
  }, [pathname, openStyle, closeStyle]);

  const chooseMen = (e: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    if (phaseRef.current !== "gender") return;
    // pushState does not hit middleware, which is what clears a Women preference on /men.
    document.cookie = `${PREFERRED_STORE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    window.history.pushState({ [GATE_HISTORY_KEY]: true }, "", `/${locale}/men`);
  };

  const chooseWomen = (e: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    if (phaseRef.current !== "gender") return;
    clearTimers();
    setPhase("women-expand");
    const wait = prefersReducedMotion() ? GATE_REDUCED_MS : GATE_EXPAND_MS;
    router.prefetch("/women");
    schedule(() => {
      startCoverHandoff({
        origin: normalizePathname(pathname),
        chosen: "women",
        image: images.women,
        alt: t("altWomen"),
      });
      router.push("/women", { scroll: false });
    }, wait);
  };

  const chooseStyle = (store: "streetwear" | "formal") => (e: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    if (phaseRef.current !== "style") return;
    phaseRef.current = store === "streetwear" ? "streetwear-leave" : "formal-leave";
    setPhase(phaseRef.current);
    router.prefetch(`/${store}`);
    startStyleHandoff({
      origin: normalizePathname(pathname),
      chosen: store,
      streetwear: images.streetwear,
      formal: images.formal,
      labels: {
        streetwear: t("streetwear"),
        formal: t("formal"),
        enter: t("enterStore"),
        subtitle: t("selectStyle"),
        back: t("back"),
      },
      alts: { streetwear: t("altStreetwear"), formal: t("altFormal") },
    });
    router.push(`/${store}`, { scroll: false });
  };

  const goBack = () => {
    const state = window.history.state as Record<string, unknown> | null;
    if (state?.[GATE_HISTORY_KEY]) {
      window.history.back();
      return;
    }
    window.history.pushState(null, "", `/${locale}`);
  };

  const focus =
    phase === "women-expand" ? "women" : phase === "gender" ? undefined : "men";
  const styleOpen =
    phase === "style-reveal" ||
    phase === "style" ||
    phase === "streetwear-leave" ||
    phase === "formal-leave";

  return (
    <div
      className="store-gate relative h-[100dvh] w-full overflow-hidden bg-black text-white"
      data-phase={phase}
      data-focus={focus}
      data-style-open={styleOpen ? "" : undefined}
    >
      <div className="pointer-events-none absolute start-1/2 top-8 z-50 flex -translate-x-1/2 flex-col items-center text-white mix-blend-difference drop-shadow-lg rtl:translate-x-1/2">
        <h1 className="text-2xl font-light uppercase tracking-[0.4em] md:text-3xl">VAULT</h1>
        <p className="gate-subtitle relative mt-2 h-4 text-xs font-light uppercase tracking-[0.2em] opacity-80 md:h-5 md:text-sm">
          <span className="gate-subtitle-gender absolute start-1/2 -translate-x-1/2 whitespace-nowrap rtl:translate-x-1/2">
            {t("selectGender")}
          </span>
          <span className="gate-subtitle-style absolute start-1/2 -translate-x-1/2 whitespace-nowrap rtl:translate-x-1/2">
            {t("selectStyle")}
          </span>
        </p>
      </div>

      <button
        type="button"
        onClick={goBack}
        className="gate-back absolute start-4 top-8 z-50 flex cursor-pointer items-center gap-2 border-0 bg-transparent p-2 text-[10px] font-light uppercase tracking-[0.25em] text-white mix-blend-difference md:start-8 md:text-xs"
        aria-label={t("backAria")}
        inert={phase !== "style"}
      >
        <svg className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {t("back")}
      </button>

      <div className="gate-layer gate-gender absolute inset-0 flex flex-col md:flex-row" inert={phase !== "gender"}>
        <Link
          href="/women"
          onClick={chooseWomen}
          data-panel="women"
          className="gate-panel group relative flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden"
        >
          <ResponsiveArtPicture
            desktopSrc={images.women.desktopSrc}
            mobileSrc={images.women.mobileSrc}
            alt={t("altWomen")}
            className="gate-panel-art absolute inset-0 block h-full w-full"
            imgClassName={PANEL_IMG}
            fetchPriority="high"
          />
          <div className={PANEL_SHADE} />
          <div className="gate-panel-copy relative z-10 flex flex-col items-center p-8 text-center">
            <h2 className="mb-4 transform text-4xl font-light uppercase tracking-[0.2em] drop-shadow-xl transition-transform duration-[800ms] ease-out md:translate-y-4 md:group-hover:translate-y-0 md:text-6xl">
              {t("women")}
            </h2>
            <span className={PANEL_CTA_LIGHT}>{t("enterStore")}</span>
          </div>
        </Link>

        <Link
          href="/men"
          onClick={chooseMen}
          data-panel="men"
          className="gate-panel group relative flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden"
        >
          <ResponsiveArtPicture
            desktopSrc={images.men.desktopSrc}
            mobileSrc={images.men.mobileSrc}
            alt={t("altMen")}
            className="gate-panel-art absolute inset-0 block h-full w-full"
            imgClassName={PANEL_IMG}
            fetchPriority="high"
          />
          <div className={PANEL_SHADE} />
          <div className="gate-panel-copy relative z-10 flex flex-col items-center p-8 text-center">
            <h2 className="mb-4 transform text-4xl font-black uppercase tracking-widest drop-shadow-xl transition-transform duration-[800ms] ease-out md:translate-y-4 md:group-hover:translate-y-0 md:text-6xl">
              {t("men")}
            </h2>
            <span className={PANEL_CTA_BOLD}>{t("enterStore")}</span>
          </div>
        </Link>
      </div>

      <div className="gate-seam pointer-events-none absolute z-20 bg-white/70" aria-hidden />

      <div className="gate-layer gate-style absolute inset-0 z-30 flex flex-col md:flex-row" inert={phase !== "style"}>
        <Link
          ref={firstStyleLinkRef}
          href="/streetwear"
          onClick={chooseStyle("streetwear")}
          data-panel="streetwear"
          className="gate-style-panel group relative flex h-full w-full flex-1 cursor-pointer flex-col items-center justify-center transition-all duration-[800ms] md:hover:flex-[1.2]"
        >
          <ResponsiveArtPicture
            desktopSrc={images.streetwear.desktopSrc}
            mobileSrc={images.streetwear.mobileSrc}
            alt={t("altStreetwear")}
            className="absolute inset-0 block h-full w-full"
            imgClassName={PANEL_IMG}
            fetchPriority={initialStep === "style" ? "high" : undefined}
          />
          <div className={PANEL_SHADE} />
          <div className="gate-style-copy relative z-10 flex flex-col items-center p-8 text-center">
            <h2 className="mb-4 transform text-4xl font-black uppercase tracking-widest drop-shadow-xl transition-transform duration-[800ms] ease-out md:translate-y-4 md:group-hover:translate-y-0 md:text-6xl">
              {t("streetwear")}
            </h2>
            <span className={PANEL_CTA_BOLD}>{t("enterStore")}</span>
          </div>
        </Link>

        <Link
          href="/formal"
          onClick={chooseStyle("formal")}
          data-panel="formal"
          className="gate-style-panel group relative flex h-full w-full flex-1 cursor-pointer flex-col items-center justify-center transition-all duration-[800ms] md:hover:flex-[1.2]"
        >
          <ResponsiveArtPicture
            desktopSrc={images.formal.desktopSrc}
            mobileSrc={images.formal.mobileSrc}
            alt={t("altFormal")}
            className="absolute inset-0 block h-full w-full"
            imgClassName={PANEL_IMG}
            fetchPriority={initialStep === "style" ? "high" : undefined}
          />
          <div className={PANEL_SHADE} />
          <div className="gate-style-copy relative z-10 flex flex-col items-center p-8 text-center">
            <h2 className="mb-4 transform text-4xl font-light uppercase tracking-[0.2em] drop-shadow-xl transition-transform duration-[800ms] ease-out md:translate-y-4 md:group-hover:translate-y-0 md:text-6xl">
              {t("formal")}
            </h2>
            <span className={PANEL_CTA_LIGHT}>{t("enterStore")}</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
