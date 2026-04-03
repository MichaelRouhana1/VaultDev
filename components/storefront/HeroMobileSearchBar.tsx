"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Mobile store landing only: sits below fixed header on hero imagery. */
export function HeroMobileSearchBar() {
  const tNav = useTranslations("Navbar");
  const tSearch = useTranslations("Search");

  return (
    <div className="pointer-events-none absolute start-0 end-0 top-14 z-[35] px-4 pt-2 sm:px-6 lg:hidden">
      <Link
        href="/search"
        className="pointer-events-auto flex w-full items-center gap-2.5 border border-white bg-transparent px-3 py-2.5 text-sm text-white opacity-100"
        aria-label={tNav("search")}
      >
        <span className="shrink-0 text-white" aria-hidden>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </span>
        <span className="truncate text-start text-white">{tSearch("placeholder")}</span>
      </Link>
    </div>
  );
}
