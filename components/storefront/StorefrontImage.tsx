"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

export function StorefrontImage({ alt, onError, unoptimized, src, ...props }: ImageProps) {
  const [retrySrc, setRetrySrc] = useState<ImageProps["src"] | null>(null);
  const useOriginal = unoptimized || retrySrc === src;

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized={useOriginal}
      onError={(event) => {
        if (!useOriginal) setRetrySrc(src);
        else onError?.(event);
      }}
    />
  );
}
