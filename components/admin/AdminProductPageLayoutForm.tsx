"use client";

import { useActionState } from "react";
import { updateProductPageLayout, type ProductPageLayout } from "@/actions/product-page-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AdminProductPageLayoutForm({ initialLayout }: { initialLayout: ProductPageLayout }) {
  const [result, save, pending] = useActionState(updateProductPageLayout, null);
  const activeLayout = result && "layout" in result ? result.layout : initialLayout;

  return (
    <form action={save} className="space-y-3">
      <Label htmlFor="product-page-layout">Product page layout</Label>
      <div className="flex flex-wrap items-center gap-3">
        <select
          id="product-page-layout"
          name="layout"
          defaultValue={activeLayout}
          disabled={pending}
          className="h-9 min-w-32 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="new">New</option>
          <option value="old">Old</option>
        </select>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save layout"}</Button>
      </div>
      {result && "error" in result ? (
        <p role="alert" className="text-sm text-destructive">{result.error}</p>
      ) : result ? (
        <p role="status" className="text-sm text-muted-foreground">Saved for all storefronts.</p>
      ) : null}
    </form>
  );
}
