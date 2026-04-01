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
}: {
  desktopSrc: string;
  mobileSrc?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "eager" | "lazy";
}) {
  const mobile = mobileSrc && mobileSrc.trim() !== "" ? mobileSrc : desktopSrc;

  return (
    <picture className={className}>
      <source media="(max-width: 768px)" srcSet={mobile} />
      <source media="(min-width: 769px)" srcSet={desktopSrc} />
      <img
        src={desktopSrc}
        alt={alt}
        className={imgClassName}
        {...(fetchPriority ? { fetchPriority } : {})}
        {...(loading ? { loading } : {})}
      />
    </picture>
  );
}
