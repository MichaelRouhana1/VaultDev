"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { cfImage, productImageSource } from "@/lib/cf-image";
import { cn } from "@/lib/utils";

const imageWidths = {
  card: [400, 800],
  pdp: [1200, 2400],
  zoom: [1200, 2400],
  thumbnail: [96],
} as const;

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "alt"> & {
  src: string;
  alt: string;
  fill?: boolean;
  variant?: keyof typeof imageWidths;
};

export function ProductImage({
  src, alt, fill, variant = "card", className, onError, loading = "lazy", decoding = "async", ...props
}: ProductImageProps) {
  const original = productImageSource(src);
  const [retrySource, setRetrySource] = useState<string | null>(null);
  const widths = imageWidths[variant];
  const defaultWidth = variant === "zoom" ? 2400 : widths[0];
  const transformed = cfImage(original, { width: defaultWidth });
  const useTransform = transformed !== original && retrySource !== original;
  const srcSet = useTransform && widths.length > 1
    ? widths.map((width) => `${cfImage(original, { width })} ${width}w`).join(", ")
    : undefined;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Cloudflare serves the responsive candidates directly.
    <img
      {...props}
      alt={alt}
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
      loading={loading}
      decoding={decoding}
      srcSet={srcSet}
      src={useTransform ? transformed : original}
      onError={(event) => {
        if (useTransform) setRetrySource(original);
        else onError?.(event);
      }}
    />
  );
}
