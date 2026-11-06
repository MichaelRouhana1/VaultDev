import { storefrontImageCandidates, type ImageWidths } from "@/lib/cf-image";

/**
 * Art-directed hero/landing/lookbook imagery: mobile vs desktop URLs via native <picture>.
 * When `mobileSrc` is missing, both viewports use the desktop asset.
 */
export function ResponsiveArtPicture({
  desktopSrc,
  mobileSrc,
  alt,
  className,
  imgClassName,
  fetchPriority,
  loading,
  sizes,
  widths,
  mobileWidths,
  quality,
}: {
  desktopSrc: string;
  mobileSrc?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "eager" | "lazy";
  sizes?: string;
  widths?: ImageWidths;
  mobileWidths?: ImageWidths;
  quality?: number;
}) {
  const mobileSource = mobileSrc?.trim() || desktopSrc;
  const desktop = widths ? storefrontImageCandidates(desktopSrc, widths, quality) : { src: desktopSrc };
  const mobile = widths && mobileSource !== desktopSrc
    ? storefrontImageCandidates(mobileSource, mobileWidths ?? widths, quality)
    : mobileSource === desktopSrc ? desktop : { src: mobileSource };

  return (
    <picture className={className}>
      <source media="(max-width: 768px)" srcSet={mobile.srcSet ?? mobile.src} sizes={mobile.srcSet ? sizes : undefined} />
      <source media="(min-width: 769px)" srcSet={desktop.srcSet ?? desktop.src} sizes={desktop.srcSet ? sizes : undefined} />
      <img
        src={desktop.src}
        srcSet={desktop.srcSet}
        sizes={desktop.srcSet ? sizes : undefined}
        alt={alt}
        className={imgClassName}
        {...(fetchPriority ? { fetchPriority } : {})}
        {...(loading ? { loading } : {})}
      />
    </picture>
  );
}
