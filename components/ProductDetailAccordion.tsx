"use client";

import { useCallback, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ProductPageAccordionResolved } from "@/actions/product-page-copy";

const triggerClass =
  "flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const titleClass =
  "text-xs font-semibold uppercase tracking-[0.2em] text-foreground";

const panelClass = "pb-5 text-sm font-light leading-relaxed text-muted-foreground";

type SectionKey = "description" | "shipping" | "returns";

export function ProductDetailAccordion({
  productDescription,
  accordionCopy,
}: {
  productDescription: string | null | undefined;
  accordionCopy: ProductPageAccordionResolved;
}) {
  const baseId = useId();
  const [open, setOpen] = useState<Partial<Record<SectionKey, boolean>>>({});

  const toggle = useCallback((key: SectionKey) => {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const mainDesc = productDescription?.trim() ?? "";

  const descriptionContent: ReactNode = mainDesc ? (
    <p className="whitespace-pre-wrap">{mainDesc}</p>
  ) : (
    <p>No description available.</p>
  );

  const sections: { key: SectionKey; title: string; content: ReactNode }[] = [
    {
      key: "description",
      title: "Description",
      content: descriptionContent,
    },
    {
      key: "shipping",
      title: "Shipping & Delivery",
      content: <p>{accordionCopy.shippingDelivery}</p>,
    },
    {
      key: "returns",
      title: "Returns",
      content: <p>{accordionCopy.returnsText}</p>,
    },
  ];

  return (
    <div className="mt-10 w-full border-t border-border">
      {sections.map(({ key, title, content }) => {
        const isOpen = Boolean(open[key]);
        const panelId = `${baseId}-${key}-panel`;
        const triggerId = `${baseId}-${key}-trigger`;
        return (
          <div key={key} className="border-b border-border last:border-b-0">
            <button
              id={triggerId}
              type="button"
              className={triggerClass}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(key)}
            >
              <span className={titleClass}>{title}</span>
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center text-lg font-light leading-none text-foreground",
                  "select-none tabular-nums",
                )}
                aria-hidden
              >
                {isOpen ? "−" : "+"}
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              className={cn(!isOpen && "hidden")}
            >
              <div className={panelClass}>{content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
