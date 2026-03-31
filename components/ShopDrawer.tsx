"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { ProductCategory } from "@/actions/categories";
import type { StoreTypeSlug } from "@/lib/preferred-store";
import { isStrictStoreLanding } from "@/lib/store-nav";
import { cn } from "@/lib/utils";

interface ShopDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ProductCategory[];
  /** Store whose categories and shop links this drawer shows */
  storeType: StoreTypeSlug;
  /** When the user switches Streetwear ↔ Formal tabs inside the drawer */
  onActiveStoreChange: (store: StoreTypeSlug) => void;
}

export function ShopDrawer({
  isOpen,
  onClose,
  categories,
  storeType,
  onActiveStoreChange,
}: ShopDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("Navbar");
  const pathname = usePathname();
  const router = useRouter();
  const baseUrl = `/${storeType}/shop`;

  const handleStoreTabClick = (target: StoreTypeSlug) => {
    if (target === storeType) return;
    if (isStrictStoreLanding(pathname)) {
      router.push(`/${target}`);
    }
    onActiveStoreChange(target);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const drawer = (
    <>
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className={`fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        aria-hidden={!isOpen}
      />

      {/* Drawer - slides in from the left */}
      <aside
        className={`fixed top-0 left-0 h-full w-[min(100vw,28rem)] min-w-[320px] flex flex-col bg-card text-card-foreground shadow-2xl z-[9999] transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.15)" }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:p-6">
          <div
            className="flex min-w-0 flex-1 items-center gap-1 rounded-md border border-border bg-muted/30 p-1"
            role="tablist"
            aria-label={t("drawerStoreTabsAria")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={storeType === "streetwear"}
              onClick={() => handleStoreTabClick("streetwear")}
              className={cn(
                "min-w-0 flex-1 rounded-sm px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider transition-colors sm:text-sm",
                storeType === "streetwear"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("streetwear")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={storeType === "formal"}
              onClick={() => handleStoreTabClick("formal")}
              className={cn(
                "min-w-0 flex-1 rounded-sm px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider transition-colors sm:text-sm",
                storeType === "formal"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("formal")}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-none p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("closeCategoryMenu")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <nav
            className="space-y-1"
            role="navigation"
            aria-label={t("categoryMenuAria", {
              store: storeType === "streetwear" ? t("streetwear") : t("formal"),
            })}
          >
            <Link
              href={baseUrl}
              onClick={onClose}
              className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 rounded-none"
            >
              {t("viewAllShop")}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`${baseUrl}?cat=${cat.slug}`}
                onClick={onClose}
                className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 rounded-none"
              >
                {cat.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(drawer, document.body);
}
