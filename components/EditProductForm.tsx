"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { updateProduct } from "@/actions/updateProduct";
import type { ProductVariantFormInitial } from "@/actions/product-admin-detail";
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
import { uploadImageFileViaPresign } from "@/lib/upload-image-presigned-client";
import type { Product, ProductColor } from "@/db/schema";
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

function buildEditVariantBootstrap(vs: ProductVariantFormInitial) {
  if (!vs.hasVariants) {
    return {
      hasVariants: false,
      optionDrafts: [] as OptionDraft[],
      matrix: {} as Record<string, VariantMatrixCell>,
      defaultSku: vs.defaultSku,
      defaultStock: String(vs.defaultStockQuantity),
    };
  }
  const optionDrafts: OptionDraft[] = vs.options.map((o) => ({
    id: crypto.randomUUID(),
    name: o.name,
    valuesText: o.values.join(", "),
  }));
  const parsedOptionsForCombos = optionDrafts
    .map((o) => ({
      name: o.name.trim(),
      values: parseValuesFromText(o.valuesText),
    }))
    .filter((o) => o.name.length > 0 && o.values.length > 0);
  const combos = buildOptionCombos(parsedOptionsForCombos);
  const optionNames = parsedOptionsForCombos.map((o) => o.name);
  const matrix: Record<string, VariantMatrixCell> = {};
  for (const combo of combos) {
    const k = comboKey(optionNames, combo);
    const match = vs.variantRows.find((r) => comboKey(optionNames, r.optionValues) === k);
    const po = match?.price_override;
    matrix[k] = {
      sku: match?.sku ?? "",
      stockQuantity: String(match?.stock_quantity ?? 0),
      priceOverride: po != null && po > 0 ? String(po) : "",
    };
  }
  return {
    hasVariants: true,
    optionDrafts,
    matrix,
    defaultSku: "",
    defaultStock: "0",
  };
}

function buildInitialColors(
  colors: ProductColor[],
  product: Product & { images?: string[] },
): ColorEntry[] {
  if (colors.length > 0) {
    return colors.map((c) => ({
      id: c.id,
      name: c.name,
      hexCode: c.hexCode ?? "#000000",
      imageUrls: c.imageUrls ?? [],
      imageFiles: [],
      stockBySize: emptyStockBySize(),
    }));
  }
  return [
    {
      id: crypto.randomUUID(),
      name: product.color ?? "Default",
      hexCode: "#000000",
      imageUrls: product.images ?? [],
      imageFiles: [],
      stockBySize: emptyStockBySize(),
    },
  ];
}

type ListingStore = "streetwear" | "formal";

export function EditProductForm({
  product,
  colors = [],
  categoryTrees,
  collectionsByStore,
  initialCollectionIds,
  attributesWithValues,
  initialAttributeValueIds,
  variantFormInitial,
}: {
  product: Product & { images?: string[] };
  colors?: ProductColor[];
  categoryTrees: Record<ListingStore, ProductFormCategoryTree>;
  collectionsByStore: Record<ListingStore, CollectionOption[]>;
  initialCollectionIds: number[];
  attributesWithValues: AttributeWithValues[];
  initialAttributeValueIds: number[];
  variantFormInitial: ProductVariantFormInitial;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const initialListing: ListingStore = product.storeType === "formal" ? "formal" : "streetwear";

  const [init] = useState(() => buildEditVariantBootstrap(variantFormInitial));
  const [hasVariants, setHasVariants] = useState(init.hasVariants);
  const [options, setOptions] = useState<OptionDraft[]>(init.optionDrafts);
  const [matrix, setMatrix] = useState<Record<string, VariantMatrixCell>>(init.matrix);
  const [defaultSku, setDefaultSku] = useState(init.defaultSku);
  const [defaultStock, setDefaultStock] = useState(init.defaultStock);
  const [productNameDraft, setProductNameDraft] = useState(product.name);

  const [listingStore, setListingStore] = useState<ListingStore>(initialListing);
  const [collectionIds, setCollectionIds] = useState<number[]>(() => [...initialCollectionIds]);
  const skipClearCollectionsRef = useRef(true);
  useEffect(() => {
    if (skipClearCollectionsRef.current) {
      skipClearCollectionsRef.current = false;
      return;
    }
    setCollectionIds([]);
  }, [listingStore]);

  const [colorsState, setColorsState] = useState<ColorEntry[]>(() => buildInitialColors(colors, product));
  const [state, setState] = useState<{ error?: string } | null>(null);
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
    setColorsState((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        hexCode: "#000000",
        imageUrls: [],
        imageFiles: [],
        stockBySize: emptyStockBySize(),
      },
    ]);
  };

  const removeColor = (id: string | number) => {
    setColorsState((prev) => prev.filter((c) => c.id !== id));
  };

  const updateColor = (id: string | number, updates: Partial<Omit<ColorEntry, "id">>) => {
    setColorsState((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addFilesToColor = (id: string | number, files: File[]) => {
    setColorsState((prev) =>
      prev.map((c) => (c.id === id ? { ...c, imageFiles: [...c.imageFiles, ...files] } : c)),
    );
  };

  const removeFileFromColor = (colorId: string | number, fileIndex: number) => {
    setColorsState((prev) =>
      prev.map((c) =>
        c.id === colorId
          ? { ...c, imageFiles: c.imageFiles.filter((_, i) => i !== fileIndex) }
          : c,
      ),
    );
  };

  const removeExistingImageFromColor = (colorId: string | number, urlIndex: number) => {
    setColorsState((prev) =>
      prev.map((c) =>
        c.id === colorId
          ? { ...c, imageUrls: (c.imageUrls ?? []).filter((_, i) => i !== urlIndex) }
          : c,
      ),
    );
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { id: crypto.randomUUID(), name: "", valuesText: "" }]);
  };

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOption = (id: string, patch: Partial<Omit<OptionDraft, "id">>) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;

    if (colorsState.length === 0) {
      setState({ error: "Add at least one color (for product images)" });
      return;
    }

    const invalidColors = colorsState.filter((c) => !c.name.trim());
    if (invalidColors.length > 0) {
      setState({ error: "Each color must have a name" });
      return;
    }

    if (!hasVariants) {
      if (colorsState.length !== 1) {
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
        (o) => o.name.trim() && parseValuesFromText(o.valuesText).length === 0,
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

    const formData = new FormData(formRef.current);
    collectionIds.forEach((id) => formData.append("collectionIds", String(id)));
    formData.set("hasVariants", hasVariants ? "true" : "false");
    formData.set("color_count", String(colorsState.length));
    for (let i = 0; i < colorsState.length; i++) {
      const color = colorsState[i]!;
      if (typeof color.id === "number") {
        formData.set(`color_${i}_id`, String(color.id));
      }
      formData.set(`color_${i}_name`, color.name.trim());
      formData.set(`color_${i}_hex`, color.hexCode || "#000000");
      formData.set(`color_${i}_existing_urls`, JSON.stringify(color.imageUrls ?? []));
      const newUrls: string[] = [];
      for (const file of color.imageFiles) {
        const up = await uploadImageFileViaPresign(file, "product-images");
        if ("error" in up) {
          setState({ error: up.error });
          setIsPending(false);
          return;
        }
        newUrls.push(up.publicUrl);
      }
      formData.set(`color_${i}_newImageUrls`, JSON.stringify(newUrls));
    }

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

    const result = await updateProduct(product.id, formData);
    setState(result);
    setIsPending(false);
    if (!result.error) {
      router.push("/admin/products");
      router.refresh();
    }
  }

  const price = typeof product.price === "string" ? product.price : String(product.price);
  const canAddAnotherColor = hasVariants || colorsState.length === 0;
  const showVariantMatrix = hasVariants && combos.length > 0;

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <input type="hidden" name="hasVariants" value={hasVariants ? "true" : "false"} />

      <Card className="w-full max-w-7xl">
        <CardHeader>
          <CardTitle>Edit product</CardTitle>
          <CardDescription>Update product details</CardDescription>
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
              defaultValue={product.description ?? ""}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PriceInput defaultValue={price} />
            <ProductTaxonomyFields
              categoryTrees={categoryTrees}
              initialStoreType={initialListing}
              initialMainCategoryId={product.mainCategoryId}
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
              <div className="grid grid-cols-1 gap-4 border-t border-border pt-2 sm:grid-cols-2">
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

          <ProductAttributeFields
            attributesWithValues={attributesWithValues}
            initialSelectedIds={initialAttributeValueIds}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isVisible"
              name="isVisible"
              value="true"
              defaultChecked={product.isVisible}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isVisible" className="font-normal">
              Visible in store
            </Label>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div>
                <h3 className="text-sm font-medium">Colors &amp; images</h3>
                <p className="text-xs text-muted-foreground">
                  {hasVariants
                    ? "Add a color for each swatch. If you use a “Color” option, values should match these names."
                    : "Exactly one color (used for gallery images on the product page)."}
                </p>
              </div>
              {canAddAnotherColor ? (
                <Button type="button" variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={addColor}>
                  Add color
                </Button>
              ) : null}
            </div>

            {colorsState.map((color) => (
              <ImageUploader
                key={String(color.id)}
                color={color}
                onUpdate={(updates) => updateColor(color.id, updates)}
                onRemove={() => removeColor(color.id)}
                onAddFiles={(files) => addFilesToColor(color.id, files)}
                onRemoveFile={(idx) => removeFileFromColor(color.id, idx)}
                onRemoveExistingImage={(idx) => removeExistingImageFromColor(color.id, idx)}
                canRemove={hasVariants && colorsState.length > 1}
              />
            ))}

            {colorsState.length === 0 && (
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <h3 className="text-sm font-medium">Options</h3>
                  <p className="text-xs text-muted-foreground">
                    Name each option (e.g. Size) and list values separated by commas (e.g. 32, 34, 36).
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={addOption}>
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
                      className="grid grid-cols-1 gap-3 border border-border rounded-md p-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
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
                        className="w-full text-destructive sm:w-auto"
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
            <Button type="submit" disabled={isPending || colorsState.length === 0}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
