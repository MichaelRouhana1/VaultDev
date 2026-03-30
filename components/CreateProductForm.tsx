"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/actions/createProduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PriceInput } from "@/components/admin/PriceInput";
import { ProductTaxonomyFields } from "@/components/admin/ProductTaxonomyFields";
import { ProductAttributeFields } from "@/components/admin/ProductAttributeFields";
import {
  ProductCollectionsFields,
  type CollectionOption,
} from "@/components/admin/ProductCollectionsFields";
import { ImageUploader, type ColorEntry } from "@/components/admin/ImageUploader";
import {
  VariantMatrixEditor,
  type VariantMatrixCell,
} from "@/components/admin/VariantMatrixEditor";
import { buildOptionCombos, comboKey } from "@/lib/product-variant-matrix";
import type { ProductFormCategoryTree } from "@/actions/categories";
import type { AttributeWithValues } from "@/actions/attributes";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

const emptyStockBySize = (): Record<string, number> =>
  Object.fromEntries(SIZES.map((s) => [s, 0])) as Record<string, number>;

type OptionDraft = { id: string; name: string; valuesText: string };

function parseValuesFromText(text: string): string[] {
  const raw = text
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function CreateProductForm({
  categoryTrees,
  collectionsByStore,
  attributesWithValues,
  initialStoreType = "streetwear",
}: {
  categoryTrees: Record<"streetwear" | "formal", ProductFormCategoryTree>;
  collectionsByStore: Record<"streetwear" | "formal", CollectionOption[]>;
  attributesWithValues: AttributeWithValues[];
  initialStoreType?: "streetwear" | "formal";
}) {
  const router = useRouter();
  const [listingStore, setListingStore] = useState<"streetwear" | "formal">(initialStoreType);
  const [collectionIds, setCollectionIds] = useState<number[]>([]);
  const skipClearCollectionsRef = useRef(true);
  useEffect(() => {
    if (skipClearCollectionsRef.current) {
      skipClearCollectionsRef.current = false;
      return;
    }
    setCollectionIds([]);
  }, [listingStore]);

  const [hasVariants, setHasVariants] = useState(false);
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [matrix, setMatrix] = useState<Record<string, VariantMatrixCell>>({});

  const [defaultSku, setDefaultSku] = useState("");
  const [defaultStock, setDefaultStock] = useState("0");
  const [productNameDraft, setProductNameDraft] = useState("");

  const [colors, setColors] = useState<ColorEntry[]>([]);
  const [state, setState] = useState<{ error?: string; productId?: number } | null>(null);
  const [isPending, setIsPending] = useState(false);

  const parsedOptionsForCombos = useMemo(() => {
    return options
      .map((o) => ({
        name: o.name.trim(),
        values: parseValuesFromText(o.valuesText),
      }))
      .filter((o) => o.name.length > 0 && o.values.length > 0);
  }, [options]);

  const combos = useMemo(
    () => buildOptionCombos(parsedOptionsForCombos),
    [parsedOptionsForCombos],
  );

  const optionNamesForKeys = useMemo(
    () => parsedOptionsForCombos.map((o) => o.name),
    [parsedOptionsForCombos],
  );

  useEffect(() => {
    if (!hasVariants || combos.length === 0) {
      return;
    }
    setMatrix((prev) => {
      const next: Record<string, VariantMatrixCell> = {};
      for (const c of combos) {
        const k = comboKey(optionNamesForKeys, c);
        const existing = prev[k];
        next[k] = existing ?? { sku: "", stockQuantity: "0", priceOverride: "" };
      }
      return next;
    });
  }, [hasVariants, combos, optionNamesForKeys]);

  const updateMatrixCell = useCallback((key: string, patch: Partial<VariantMatrixCell>) => {
    setMatrix((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? { sku: "", stockQuantity: "0", priceOverride: "" }),
        ...patch,
      },
    }));
  }, []);

  const addColor = () => {
    setColors((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        hexCode: "#000000",
        imageFiles: [],
        stockBySize: emptyStockBySize(),
      },
    ]);
  };

  const removeColor = (id: string | number) => {
    setColors((prev) => prev.filter((c) => c.id !== id));
  };

  const updateColor = (id: string | number, updates: Partial<Omit<ColorEntry, "id">>) => {
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addFilesToColor = (id: string | number, files: File[]) => {
    setColors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, imageFiles: [...c.imageFiles, ...files] } : c)),
    );
  };

  const removeFileFromColor = (colorId: string | number, fileIndex: number) => {
    setColors((prev) =>
      prev.map((c) =>
        c.id === colorId
          ? { ...c, imageFiles: c.imageFiles.filter((_, i) => i !== fileIndex) }
          : c,
      ),
    );
  };

  const addOption = () => {
    setOptions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", valuesText: "" },
    ]);
  };

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOption = (id: string, patch: Partial<Omit<OptionDraft, "id">>) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form) return;

    if (colors.length === 0) {
      setState({ error: "Add at least one color (for product images)" });
      return;
    }

    const invalidColors = colors.filter((c) => !c.name.trim());
    if (invalidColors.length > 0) {
      setState({ error: "Each color must have a name" });
      return;
    }

    if (!hasVariants) {
      if (colors.length !== 1) {
        setState({
          error:
            "Single-variant mode allows exactly one color (for images). Turn on options for multiple colors, or remove extra colors.",
        });
        return;
      }
      if (!defaultSku.trim()) {
        setState({ error: "SKU is required" });
        return;
      }
      const st = parseInt(defaultStock, 10);
      if (!Number.isFinite(st) || st < 0) {
        setState({ error: "Stock quantity must be a non-negative number" });
        return;
      }
    } else {
      if (parsedOptionsForCombos.length === 0) {
        setState({ error: "Add at least one option with a name and values" });
        return;
      }
      const incomplete = options.some(
        (o) =>
          o.name.trim() &&
          parseValuesFromText(o.valuesText).length === 0,
      );
      if (incomplete) {
        setState({ error: "Each option with a name must list at least one value" });
        return;
      }
      const unnamed = options.some((o) => !o.name.trim() && parseValuesFromText(o.valuesText).length > 0);
      if (unnamed) {
        setState({ error: "Each option with values must have a name" });
        return;
      }

      if (combos.length === 0) {
        setState({ error: "Could not build variant combinations from options" });
        return;
      }

      for (const c of combos) {
        const k = comboKey(optionNamesForKeys, c);
        const cell = matrix[k];
        if (!cell?.sku?.trim()) {
          setState({ error: "Every variant row needs a SKU" });
          return;
        }
        const sq = parseInt(cell.stockQuantity, 10);
        if (!Number.isFinite(sq) || sq < 0) {
          setState({ error: "Every variant row needs a valid stock quantity" });
          return;
        }
        const po = cell.priceOverride.trim();
        if (po !== "") {
          const n = parseFloat(po);
          if (!Number.isFinite(n) || n <= 0) {
            setState({ error: "Price override must be empty or a positive number" });
            return;
          }
        }
      }
    }

    setIsPending(true);
    setState(null);

    const formData = new FormData(form);
    collectionIds.forEach((id) => formData.append("collectionIds", String(id)));
    formData.set("color_count", String(colors.length));
    colors.forEach((color, i) => {
      formData.set(`color_${i}_name`, color.name.trim());
      formData.set(`color_${i}_hex`, color.hexCode || "#000000");
      color.imageFiles.forEach((file) => {
        formData.append(`color_${i}_images`, file);
      });
    });

    if (hasVariants) {
      formData.set("optionsJson", JSON.stringify(parsedOptionsForCombos));
      const variantsPayload = combos.map((combo) => {
        const k = comboKey(optionNamesForKeys, combo);
        const cell = matrix[k]!;
        const po = cell.priceOverride.trim();
        let price_override: number | null = null;
        if (po !== "") {
          price_override = parseFloat(po);
        }
        return {
          sku: cell.sku.trim(),
          stock_quantity: parseInt(cell.stockQuantity, 10) || 0,
          price_override,
          optionValues: combo,
        };
      });
      formData.set("variantsJson", JSON.stringify(variantsPayload));
    } else {
      formData.set("defaultSku", defaultSku.trim());
      formData.set("defaultStockQuantity", String(parseInt(defaultStock, 10) || 0));
    }

    const result = await createProduct(formData);
    setState(result);
    setIsPending(false);
    if (result.productId) {
      router.push("/admin/products");
      router.refresh();
    }
  }

  if (state?.productId) {
    return null;
  }

  const canAddAnotherColor = hasVariants || colors.length === 0;
  const showVariantMatrix = hasVariants && combos.length > 0;

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="hasVariants" value={hasVariants ? "true" : "false"} />

      <Card className="w-full max-w-7xl">
        <CardHeader>
          <CardTitle>Product details</CardTitle>
          <CardDescription>Add a new product to your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Product name"
              value={productNameDraft}
              onChange={(e) => setProductNameDraft(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Product description"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PriceInput />
            <ProductTaxonomyFields
              categoryTrees={categoryTrees}
              initialStoreType={initialStoreType}
              listingStore={listingStore}
              onListingStoreChange={setListingStore}
            />
            <ProductCollectionsFields
              collectionsByStore={collectionsByStore}
              listingStore={listingStore}
              selectedIds={collectionIds}
              onChange={setCollectionIds}
            />
          </div>

          <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="hasVariantsToggle"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <div>
                <Label htmlFor="hasVariantsToggle" className="font-medium cursor-pointer">
                  This product has options, like size or color
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When off, you set one SKU and stock. When on, build options and a variant matrix (each row is a sellable SKU).
                </p>
              </div>
            </div>

            {!hasVariants ? (
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
                <div className="space-y-2">
                  <Label htmlFor="defaultSku">SKU</Label>
                  <Input
                    id="defaultSku"
                    value={defaultSku}
                    onChange={(e) => setDefaultSku(e.target.value)}
                    placeholder="e.g. VAULT-SHIRT-001"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultStock">Stock quantity</Label>
                  <Input
                    id="defaultStock"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={defaultStock}
                    onChange={(e) => setDefaultStock(e.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <ProductAttributeFields attributesWithValues={attributesWithValues} />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isVisible"
              name="isVisible"
              value="true"
              defaultChecked
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isVisible" className="font-normal">
              Visible in store
            </Label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium">Colors &amp; images</h3>
                <p className="text-xs text-muted-foreground">
                  {hasVariants
                    ? "Add a color for each swatch. If you use a “Color” option, values must match these names."
                    : "Exactly one color (used for gallery images on the product page)."}
                </p>
              </div>
              {canAddAnotherColor ? (
                <Button type="button" variant="outline" size="sm" onClick={addColor}>
                  Add color
                </Button>
              ) : null}
            </div>

            {colors.map((color) => (
              <ImageUploader
                key={color.id}
                color={color}
                onUpdate={(updates) => updateColor(color.id, updates)}
                onRemove={() => removeColor(color.id)}
                onAddFiles={(files) => addFilesToColor(color.id, files)}
                onRemoveFile={(idx) => removeFileFromColor(color.id, idx)}
                canRemove={hasVariants && colors.length > 1}
              />
            ))}

            {colors.length === 0 && (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">Add at least one color with images.</p>
                <Button type="button" variant="outline" onClick={addColor}>
                  Add first color
                </Button>
              </div>
            )}
          </div>

          {hasVariants ? (
            <div className="space-y-4 border-t border-border pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium">Options</h3>
                  <p className="text-xs text-muted-foreground">
                    Name each option (e.g. Size) and list values separated by commas (e.g. 32, 34, 36).
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  Add option
                </Button>
              </div>

              {options.length === 0 ? (
                <p className="text-sm text-muted-foreground">No options yet. Click “Add option” to build variants.</p>
              ) : (
                <div className="space-y-3">
                  {options.map((opt) => (
                    <div
                      key={opt.id}
                      className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end border border-border rounded-md p-3"
                    >
                      <div className="space-y-2">
                        <Label className="text-xs">Option name</Label>
                        <Input
                          value={opt.name}
                          onChange={(e) => updateOption(opt.id, { name: e.target.value })}
                          placeholder="e.g. Size, Color"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-1">
                        <Label className="text-xs">Values (comma-separated)</Label>
                        <Input
                          value={opt.valuesText}
                          onChange={(e) => updateOption(opt.id, { valuesText: e.target.value })}
                          placeholder="e.g. 32, 34, 36 or Red, Blue"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeOption(opt.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {showVariantMatrix ? (
                <VariantMatrixEditor
                  productName={productNameDraft}
                  optionNamesForKeys={optionNamesForKeys}
                  combos={combos}
                  matrix={matrix}
                  setMatrix={setMatrix}
                  updateMatrixCell={updateMatrixCell}
                />
              ) : null}
            </div>
          ) : null}

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isPending || colors.length === 0}>
              {isPending ? "Creating…" : "Create product"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
