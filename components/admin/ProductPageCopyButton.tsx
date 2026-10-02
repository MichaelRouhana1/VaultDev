"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  loadAdminProductPageAccordionCopy,
  saveProductPageAccordionCopy,
} from "@/actions/product-page-copy";
import { storeTypeLabelEn } from "@/lib/store-type-display";

const textareaClass =
  "border-input mt-1.5 min-h-[100px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring";

type Props = {
  storeType: "streetwear" | "formal";
};

export function ProductPageCopyButton({ storeType }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [copyReady, setCopyReady] = useState(false);
  const [shippingDelivery, setShippingDelivery] = useState("");
  const [returnsText, setReturnsText] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingCopy(true);
    setCopyReady(false);
    void (async () => {
      const res = await loadAdminProductPageAccordionCopy(storeType);
      if (cancelled) return;
      setLoadingCopy(false);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setShippingDelivery(res.copy.shippingDelivery);
      setReturnsText(res.copy.returnsText);
      setCopyReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, storeType]);

  async function handleSave() {
    setBusy(true);
    const res = await saveProductPageAccordionCopy(storeType, {
      shippingDelivery,
      returnsText,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Product page details saved");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="rounded-none border-foreground/20 uppercase tracking-wider"
        onClick={() => setOpen(true)}
      >
        Product details
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-none sm:rounded-none">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wider">Product page details</DialogTitle>
            <DialogDescription>
              Shipping &amp; Delivery and Returns text for product pages when managing{" "}
              <span className="text-foreground">{storeTypeLabelEn(storeType)}</span>. The Description accordion still uses each
              product’s own description from the product editor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div>
              <Label htmlFor="pdp-shipping" className="text-xs font-semibold uppercase tracking-widest">
                Shipping &amp; delivery
              </Label>
              <textarea
                id="pdp-shipping"
                value={shippingDelivery}
                onChange={(e) => setShippingDelivery(e.target.value)}
                className={textareaClass}
                rows={5}
                disabled={loadingCopy}
              />
            </div>
            <div>
              <Label htmlFor="pdp-returns" className="text-xs font-semibold uppercase tracking-widest">
                Returns
              </Label>
              <textarea
                id="pdp-returns"
                value={returnsText}
                onChange={(e) => setReturnsText(e.target.value)}
                className={textareaClass}
                rows={5}
                disabled={loadingCopy}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-none" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-none uppercase tracking-wider"
              disabled={busy || loadingCopy || !copyReady}
              onClick={() => void handleSave()}
            >
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
