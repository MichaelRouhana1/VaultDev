"use client";

import { useLayoutEffect, useRef, useState, type MutableRefObject } from "react";
import { useTranslations } from "next-intl";
import { ProgressiveZoomPhoto, type ProductZoomSession } from "@/components/storefront/ProgressiveZoomPhoto";
import { cn } from "@/lib/utils";

export type ZoomTouchPoint = { x: number; y: number };
export type ZoomTouchPhase = "start" | "move" | "end";
export type ZoomTouchOp = { phase: ZoomTouchPhase; points: ZoomTouchPoint[] };

export type MobileZoomApi = {
  touches: (phase: ZoomTouchPhase, points: ZoomTouchPoint[]) => void;
};

const minScale = 0.5;
const maxScale = 4;
const closeScale = 0.72;
const swipeDistance = 56;

type Pose = { scale: number; x: number; y: number };
type Drag =
  | {
      kind: "pinch";
      distance: number;
      cx: number;
      cy: number;
      scale: number;
      x: number;
      y: number;
    }
  | {
      kind: "pan" | "swipe" | "ignore";
      x: number;
      y: number;
      originX: number;
      originY: number;
      poseX: number;
      poseY: number;
      dx: number;
      dy: number;
      moved: boolean;
    };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pinchPoints(points: ZoomTouchPoint[]) {
  const [a, b] = points;
  return {
    distance: Math.hypot(b.x - a.x, b.y - a.y),
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
  };
}

export function MobilePhotoZoom({
  images,
  index,
  name,
  session,
  apiRef,
  queueRef,
  onIndexChange,
  onClose,
}: {
  images: string[];
  index: number;
  name: string;
  session: ProductZoomSession;
  apiRef: MutableRefObject<MobileZoomApi | null>;
  queueRef: MutableRefObject<ZoomTouchOp[]>;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations("ProductDetail");
  const tCommon = useTranslations("Common");
  const stageRef = useRef<HTMLDivElement>(null);
  const poseRef = useRef<Pose>({ scale: 1, x: 0, y: 0 });
  const dragRef = useRef<Drag | null>(null);
  const lastTap = useRef(0);
  const indexRef = useRef(index);
  const [pose, setPose] = useState<Pose>(poseRef.current);
  const [pinching, setPinching] = useState(false);
  const [settling, setSettling] = useState(false);
  const src = images[index];
  const count = images.length;

  const commit = (next: Pose, animate: boolean) => {
    const stage = stageRef.current;
    let poseNext = next;
    if (stage && next.scale > 1.05) {
      const image = stage.querySelector("img");
      const maxX = Math.max(0, ((image?.clientWidth ?? stage.clientWidth) * next.scale - stage.clientWidth) / 2);
      const maxY = Math.max(0, ((image?.clientHeight ?? stage.clientHeight) * next.scale - stage.clientHeight) / 2);
      poseNext = {
        scale: Math.min(maxScale, next.scale),
        x: clamp(next.x, -maxX, maxX),
        y: clamp(next.y, -maxY, maxY),
      };
    }
    poseRef.current = poseNext;
    setSettling(animate);
    setPose(poseNext);
  };

  const zoomToPoint = (x: number, y: number, scale: number) => {
    const stage = stageRef.current?.getBoundingClientRect();
    const current = poseRef.current;
    if (!stage) {
      commit({ scale, x: 0, y: 0 }, true);
      return;
    }
    const originX = stage.left + stage.width / 2;
    const originY = stage.top + stage.height / 2;
    const pointX = (x - originX - current.x) / current.scale;
    const pointY = (y - originY - current.y) / current.scale;
    commit({
      scale,
      x: x - originX - pointX * scale,
      y: y - originY - pointY * scale,
    }, true);
  };

  const finish = () => {
    dragRef.current = null;
    setPinching(false);
    const current = poseRef.current;
    if (current.scale < closeScale) {
      onClose();
      return;
    }
    if (current.scale < 1) commit({ scale: 1, x: 0, y: 0 }, true);
    else commit(current, true);
  };

  const onTouches = (phase: ZoomTouchPhase, points: ZoomTouchPoint[]) => {
    const current = poseRef.current;
    if (phase === "start" && points.length >= 2) {
      const pinch = pinchPoints(points);
      dragRef.current = {
        kind: "pinch",
        distance: pinch.distance || 1,
        cx: pinch.cx,
        cy: pinch.cy,
        scale: current.scale,
        x: current.x,
        y: current.y,
      };
      setPinching(true);
      setSettling(false);
      return;
    }
    if (phase === "start" && points.length === 1) {
      dragRef.current = {
        kind: current.scale > 1.05 ? "pan" : "swipe",
        x: points[0].x,
        y: points[0].y,
        originX: points[0].x,
        originY: points[0].y,
        poseX: current.x,
        poseY: current.y,
        dx: 0,
        dy: 0,
        moved: false,
      };
      setSettling(false);
      return;
    }
    if (phase === "move") {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.kind === "pinch") {
        if (points.length >= 2) {
          const pinch = pinchPoints(points);
          const scale = clamp(drag.scale * (pinch.distance / drag.distance), minScale, maxScale);
          const stage = stageRef.current?.getBoundingClientRect();
          if (!stage) {
            commit({ scale, x: drag.x, y: drag.y }, false);
            return;
          }
          const originX = stage.left + stage.width / 2;
          const originY = stage.top + stage.height / 2;
          const pointX = (drag.cx - originX - drag.x) / drag.scale;
          const pointY = (drag.cy - originY - drag.y) / drag.scale;
          commit({
            scale,
            x: pinch.cx - originX - pointX * scale,
            y: pinch.cy - originY - pointY * scale,
          }, false);
          return;
        }
        if (points.length === 1 && current.scale > 1) {
          dragRef.current = {
            kind: "pan",
            x: points[0].x,
            y: points[0].y,
            originX: points[0].x,
            originY: points[0].y,
            poseX: current.x,
            poseY: current.y,
            dx: 0,
            dy: 0,
            moved: true,
          };
        }
        return;
      }
      if (drag.kind === "ignore" || points.length === 0) return;
      const dx = points[0].x - drag.originX;
      const dy = points[0].y - drag.originY;
      drag.dx = dx;
      drag.dy = dy;
      if (Math.hypot(dx, dy) > 8) drag.moved = true;
      if (drag.kind === "pan") {
        commit({ scale: current.scale, x: drag.poseX + dx, y: drag.poseY + dy }, false);
        return;
      }
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 16) {
        drag.kind = "ignore";
        return;
      }
      commit({ scale: 1, x: dx * 0.35, y: 0 }, false);
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === "ignore" && points.length === 0) {
      dragRef.current = null;
      commit({ scale: 1, x: 0, y: 0 }, true);
      return;
    }
    if (drag.kind === "swipe" && points.length === 0) {
      const dx = drag.dx;
      dragRef.current = null;
      if (drag.moved && Math.abs(dx) > swipeDistance && count > 1) {
        const rtl = document.documentElement.dir === "rtl";
        const forward = rtl ? dx > 0 : dx < 0;
        commit({ scale: 1, x: 0, y: 0 }, false);
        onIndexChange((indexRef.current + (forward ? 1 : -1) + count) % count);
        return;
      }
      if (!drag.moved) {
        const now = Date.now();
        if (now - lastTap.current < 280) {
          lastTap.current = 0;
          if (current.scale > 1.08) commit({ scale: 1, x: 0, y: 0 }, true);
          else zoomToPoint(drag.originX, drag.originY, 2);
          return;
        }
        lastTap.current = now;
      }
      commit({ scale: 1, x: 0, y: 0 }, true);
      return;
    }
    if (drag.kind === "pan" && !drag.moved && points.length === 0) {
      const now = Date.now();
      const x = drag.originX;
      const y = drag.originY;
      dragRef.current = null;
      if (now - lastTap.current < 280) {
        lastTap.current = 0;
        if (poseRef.current.scale > 1.08) commit({ scale: 1, x: 0, y: 0 }, true);
        else zoomToPoint(x, y, 2);
        return;
      }
      lastTap.current = now;
      return;
    }
    if (points.length === 0) finish();
  };

  const onTouchesRef = useRef(onTouches);
  onTouchesRef.current = onTouches;
  indexRef.current = index;
  const [trackedIndex, setTrackedIndex] = useState(index);
  if (index !== trackedIndex) {
    setTrackedIndex(index);
    poseRef.current = { scale: 1, x: 0, y: 0 };
    setPose(poseRef.current);
    dragRef.current = null;
  }

  useLayoutEffect(() => {
    const api = {
      touches: (phase: ZoomTouchPhase, points: ZoomTouchPoint[]) => onTouchesRef.current(phase, points),
    };
    apiRef.current = api;
    const queued = queueRef.current.splice(0);
    for (const op of queued) api.touches(op.phase, op.points);
    return () => {
      if (apiRef.current === api) apiRef.current = null;
    };
  }, [apiRef, queueRef]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const listener = (event: TouchEvent) => {
      if ((event.target as Element | null)?.closest?.("button, a")) return;
      event.preventDefault();
      const points = Array.from(event.touches).map((touch) => ({ x: touch.clientX, y: touch.clientY }));
      const phase: ZoomTouchPhase = event.type === "touchstart"
        ? "start"
        : points.length > 0 && event.type !== "touchcancel"
          ? "move"
          : "end";
      onTouchesRef.current(phase, points);
    };
    stage.addEventListener("touchstart", listener, { passive: false });
    stage.addEventListener("touchmove", listener, { passive: false });
    stage.addEventListener("touchend", listener);
    stage.addEventListener("touchcancel", listener);
    return () => {
      stage.removeEventListener("touchstart", listener);
      stage.removeEventListener("touchmove", listener);
      stage.removeEventListener("touchend", listener);
      stage.removeEventListener("touchcancel", listener);
    };
  }, []);

  if (!src) return null;

  return (
    <div
      ref={stageRef}
      className="fixed inset-0 z-[200] bg-background touch-none"
      role="dialog"
      aria-modal="true"
      aria-label={t("galleryAria")}
    >
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          settling && "transition-transform duration-200 ease-out motion-reduce:transition-none",
        )}
        style={{ transform: `translate(${pose.x}px, ${pose.y}px) scale(${pose.scale})` }}
      >
        <ProgressiveZoomPhoto
          key={src}
          src={src}
          alt={t("zoomedAlt", { index: index + 1, name })}
          session={session}
          active
          scale={pose.scale}
          pinching={pinching}
          previous={images[(index - 1 + count) % count]}
          next={images[(index + 1) % count]}
          fit="contain"
          noImage={t("noImage")}
          className="max-h-full max-w-full"
        />
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute end-4 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center text-foreground"
        aria-label={tCommon("close")}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {count > 1 && pose.scale <= 1.05 && (
        <div className="absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] flex justify-center gap-1.5">
          {images.map((image, imageIndex) => (
              <button
              key={`${imageIndex}:${image}`}
              type="button"
              aria-label={t("thumbAlt", { index: imageIndex + 1, name })}
              aria-pressed={imageIndex === index}
              onClick={() => onIndexChange(imageIndex)}
              className={cn(
                "h-1.5 rounded-full",
                imageIndex === index ? "w-4 bg-foreground" : "w-1.5 bg-foreground/40",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
