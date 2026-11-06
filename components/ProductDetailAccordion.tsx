"use client";

import { useCallback, useId, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ProductPageAccordionResolved } from "@/actions/product-page-copy";

const triggerClass =
  "flex min-h-14 w-full scroll-mt-16 items-center justify-between gap-4 py-3 text-left transition-colors hover:text-foreground/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const titleClass =
  "text-xs font-bold uppercase";

const panelClass = "pb-5 text-sm leading-relaxed text-foreground/75";

type SectionKey = "description" | "shipping" | "returns";

export function ProductDetailAccordion({
  id,
  appearance = "new",
  productDescription,
  accordionCopy,
}: {
  id?: string;
  appearance?: "new" | "old";
  productDescription: string | null | undefined;
  accordionCopy: ProductPageAccordionResolved;
}) {
  const fallbackId = useId();
  const baseId = id ?? fallbackId;
  const t = useTranslations("ProductDetail");
  const old = appearance === "old";
  const [open, setOpen] = useState<Partial<Record<SectionKey, boolean>>>({});

  const toggle = useCallback((key: SectionKey) => {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const mainDesc = productDescription?.trim() ?? "";

  const descriptionContent: ReactNode = mainDesc ? (
    <p className="whitespace-pre-wrap">{mainDesc}</p>
  ) : (
    <p>{t("noDescription")}</p>
  );

  const sections: { key: SectionKey; title: string; content: ReactNode }[] = [
    {
      key: "description",
      title: t("detailsDescription"),
      content: descriptionContent,
    },
    {
      key: "shipping",
      title: t("detailsShipping"),
      content: <p>{accordionCopy.shippingDelivery}</p>,
    },
    {
      key: "returns",
      title: t("detailsReturns"),
      content: <p>{accordionCopy.returnsText}</p>,
    },
  ];

  return (
    <div id={id} className={cn("w-full", old && "mt-10 border-t border-border")}>
      {sections.map(({ key, title, content }) => {
        const isOpen = Boolean(open[key]);
        const panelId = `${baseId}-${key}-panel`;
        const triggerId = `${baseId}-${key}`;
        return (
          <div key={key} className={cn("border-b border-border", old && "last:border-b-0")}>
            <button
              id={triggerId}
              type="button"
              className={cn(triggerClass, old && "py-4")}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(key)}
            >
              <span className={cn(titleClass, old && "font-semibold tracking-[0.2em]")}>{title}</span>
              {old ? (
                <span className="grid size-8 shrink-0 place-items-center text-lg font-light" aria-hidden>
                  {isOpen ? "−" : "+"}
                </span>
              ) : (
                <ArrowRight className={cn("size-5 shrink-0 transition-transform motion-reduce:transition-none", isOpen && "rotate-90")} aria-hidden />
              )}
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              className={cn(!isOpen && "hidden")}
            >
              <div className={cn(panelClass, old && "font-light text-muted-foreground")}>{content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
