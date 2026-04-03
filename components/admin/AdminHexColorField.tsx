"use client";

import { useCallback, useEffect, useState } from "react";
import { Pipette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }
}

/** Valid 6-digit hex for `<input type="color">` value. */
function hexForColorInput(raw: string): string {
  const s = raw.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(s)) return s.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/i.test(s)) {
    const r = s[1]!;
    const g = s[2]!;
    const b = s[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "#000000";
}

export interface AdminEyedropperButtonProps {
  onPick: (hex: string) => void;
  /** Used for accessible names. */
  colorLabel?: string;
  className?: string;
}

/** Screen eyedropper (Chromium); renders nothing when unsupported. */
export function AdminEyedropperButton({
  onPick,
  colorLabel = "color",
  className,
}: AdminEyedropperButtonProps) {
  const [eyeDropperSupported, setEyeDropperSupported] = useState(false);

  useEffect(() => {
    setEyeDropperSupported(typeof window !== "undefined" && typeof window.EyeDropper === "function");
  }, []);

  const handleEyeDropper = useCallback(async () => {
    const EyeDropperCtor = window.EyeDropper;
    if (!EyeDropperCtor) return;
    try {
      const dropper = new EyeDropperCtor();
      const result = await dropper.open();
      if (result?.sRGBHex) onPick(result.sRGBHex.toLowerCase());
    } catch {
      // User cancelled or dialog failed — ignore
    }
  }, [onPick]);

  if (!eyeDropperSupported) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("h-9 w-9 shrink-0 border-input", className)}
      title="Pick color from screen (click a pixel on the image)"
      aria-label={`Sample color from screen for ${colorLabel}`}
      onClick={() => void handleEyeDropper()}
    >
      <Pipette className="h-4 w-4" aria-hidden />
    </Button>
  );
}

export interface AdminHexColorFieldProps {
  id: string;
  value: string;
  onChange: (hex: string) => void;
  /** Used for accessible names on controls. */
  colorLabel?: string;
  className?: string;
  /** Hide pipette (e.g. when sampling is offered in the image crop modal instead). */
  showEyedropper?: boolean;
}

/**
 * Hex text field + optional screen eyedropper + native color picker swatch.
 */
export function AdminHexColorField({
  id,
  value,
  onChange,
  colorLabel = "color",
  className,
  showEyedropper = true,
}: AdminHexColorFieldProps) {
  const [eyeDropperSupported, setEyeDropperSupported] = useState(false);

  useEffect(() => {
    setEyeDropperSupported(typeof window !== "undefined" && typeof window.EyeDropper === "function");
  }, []);

  const colorInputValue = hexForColorInput(value);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="min-w-[7rem] flex-1 font-mono"
        spellCheck={false}
        autoComplete="off"
        aria-label={`Hex code for ${colorLabel}`}
      />
      {showEyedropper ? <AdminEyedropperButton onPick={onChange} colorLabel={colorLabel} /> : null}
      <input
        type="color"
        value={colorInputValue}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-background p-0.5 shadow-xs dark:bg-input/30"
        title={eyeDropperSupported ? "Open color picker" : "Choose color (includes eyedropper in some browsers)"}
        aria-label={`Color picker for ${colorLabel}`}
      />
    </div>
  );
}
