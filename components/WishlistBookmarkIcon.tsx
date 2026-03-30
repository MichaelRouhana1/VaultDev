import { cn } from "@/lib/utils";

const BOOKMARK_PATH = "m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z";

/**
 * Bookmark glyph for wishlist / saved items (Lucide-style).
 * `active` = filled; otherwise stroked outline.
 */
export function WishlistBookmarkIcon({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <svg
      className={cn(className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {active ? (
        <path d={BOOKMARK_PATH} fill="currentColor" />
      ) : (
        <path
          d={BOOKMARK_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
