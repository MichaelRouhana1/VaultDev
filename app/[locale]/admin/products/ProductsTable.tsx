"use client";

import { useState, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { StockHoverCell, productHasLowStock, type AdminVariantStockRow } from "./StockHoverCell";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/low-stock-threshold";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MoreHorizontal } from "lucide-react";
import { deleteProduct } from "@/actions/deleteProduct";
import { storeTypeLabelEn } from "@/lib/store-type-display";
import { forceDeleteProduct } from "@/actions/forceDeleteProduct";
import { bulkArchiveProducts } from "@/actions/bulkArchiveProducts";
import { bulkForceDeleteProducts } from "@/actions/bulkForceDeleteProducts";
import { applyBulkDiscount, removeBulkDiscount, clearExpiredSales } from "@/actions/bulk-discount";
import { getProductDisplayPrice, isProductOnSale, getProductDiscountPercent } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ProductWithMeta {
  id: number;
  name: string;
  description: string | null;
  price: string;
  salePrice: string | null;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
  isSaleActive?: boolean;
  images: string[];
  isVisible: boolean;
  isArchived?: boolean;
  totalStock: number;
  variantStockRows: AdminVariantStockRow[];
  categoryLabel: string;
  colorLabel: string;
}

interface ProductCategoryRow {
  id: number;
  slug: string;
  label: string;
}

interface ProductsTableProps {
  products: ProductWithMeta[];
  initialQuery?: string;
  initialCategory?: string;
  categories: ProductCategoryRow[];
  storeType?: string;
  /** Admin-configured low-stock threshold (variants with qty in (0, threshold)). */
  lowStockThreshold?: number;
}

export function ProductsTable({
  products,
  initialQuery = "",
  initialCategory = "all",
  categories,
  storeType = "streetwear",
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
}: ProductsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("");
  const [saleStartDate, setSaleStartDate] = useState("");
  const [saleEndDate, setSaleEndDate] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isClearingExpired, setIsClearingExpired] = useState(false);
  const [rowActionsProduct, setRowActionsProduct] = useState<ProductWithMeta | null>(null);
  const [forceDeleteTarget, setForceDeleteTarget] = useState<{
    ids: number[];
    summary: string;
  } | null>(null);
  const [isBulkArchiving, startBulkArchive] = useTransition();
  const [isForceDeleting, setIsForceDeleting] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set("q", query);
    else params.delete("q");
    if (category && category !== "all") params.set("category", category);
    else params.delete("category");
    router.push(`/admin/products?${params.toString()}`);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set("category", value);
    else params.delete("category");
    router.push(`/admin/products?${params.toString()}`);
  };

  const handleArchive = async (id: number, name: string) => {
    if (
      !confirm(
        `Archive "${name}"? It will disappear from the storefront but stay in the admin list and order history.`,
      )
    )
      return;
    const archived = await deleteProduct(id);
    if (archived.success === false) {
      toast.error(archived.error);
      return;
    }
    toast.success("Product archived");
    setRowSelection((prev) => {
      const next = { ...prev };
      delete next[String(id)];
      return next;
    });
    router.refresh();
  };

  const handleBulkArchive = () => {
    if (selectedCount === 0) return;
    if (
      !confirm(
        `Archive ${selectedCount} product${selectedCount !== 1 ? "s" : ""}? They will be hidden from the storefront.`,
      )
    )
      return;
    startBulkArchive(async () => {
      const res = await bulkArchiveProducts(selectedIds);
      if (res.success === false) {
        toast.error(res.error);
        return;
      }
      toast.success(`Archived ${res.archived} product(s)`);
      setRowSelection({});
      router.refresh();
    });
  };

  const openForceDeleteDialog = (ids: number[], summary: string) => {
    setForceDeleteTarget({ ids, summary });
  };

  const runForceDelete = async () => {
    if (!forceDeleteTarget) return;
    const { ids } = forceDeleteTarget;
    setForceDeleteTarget(null);
    setIsForceDeleting(true);
    try {
      if (ids.length === 1) {
        const res = await forceDeleteProduct(ids[0]!);
        if (res.success === false) {
          toast.error(res.error);
          return;
        }
        toast.success("Product permanently deleted");
      } else {
        const res = await bulkForceDeleteProducts(ids);
        if (res.success === false) {
          toast.error(res.error);
          return;
        }
        toast.success(`Permanently deleted ${res.deleted} product(s)`);
      }
      setRowSelection((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[String(id)];
        return next;
      });
      router.refresh();
    } finally {
      setIsForceDeleting(false);
    }
  };

  const selectedIds = Object.keys(rowSelection)
    .filter((key) => rowSelection[key])
    .map(Number);
  const selectedCount = selectedIds.length;

  const handleApplyDiscount = async () => {
    const pct = parseFloat(discountPercent);
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      toast.error("Enter a valid percentage (e.g. 20)");
      return;
    }
    setIsApplying(true);
    try {
      const options: { saleStartsAt?: Date | string | null; saleEndsAt?: Date | string | null } = {};
      if (saleStartDate) options.saleStartsAt = saleStartDate;
      if (saleEndDate) options.saleEndsAt = saleEndDate;
      const applied = await applyBulkDiscount(selectedIds, "PERCENTAGE", pct, options);
      if (applied && "success" in applied && applied.success === false) {
        toast.error(applied.error);
        return;
      }
      toast.success(`Discount applied to ${selectedCount} product(s)`);
      setRowSelection({});
      setDiscountModalOpen(false);
      setDiscountPercent("");
      setSaleStartDate("");
      setSaleEndDate("");
      router.refresh();
    } catch {
      toast.error("Failed to apply discount");
    } finally {
      setIsApplying(false);
    }
  };

  const previewProduct = products.find((p) => selectedIds.includes(p.id));
  const previewOriginal = previewProduct ? parseFloat(String(previewProduct.price)) : 0;
  const previewPct = parseFloat(discountPercent);
  const previewNew =
    Number.isFinite(previewPct) && previewPct > 0 && previewPct < 100
      ? previewOriginal * (1 - previewPct / 100)
      : 0;

  const handleRemoveDiscount = async () => {
    setIsRemoving(true);
    try {
      const removed = await removeBulkDiscount(selectedIds);
      if (removed && "success" in removed && removed.success === false) {
        toast.error(removed.error);
        return;
      }
      toast.success(`Discount removed from ${selectedCount} product(s)`);
      setRowSelection({});
      router.refresh();
    } catch {
      toast.error("Failed to remove discount");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleClearExpiredSales = async () => {
    setIsClearingExpired(true);
    try {
      const clearedResult = await clearExpiredSales();
      if ("success" in clearedResult) {
        toast.error(clearedResult.error);
        return;
      }
      const { cleared } = clearedResult;
      toast.success(cleared > 0 ? `Cleared ${cleared} expired sale(s)` : "No expired sales found");
      router.refresh();
    } catch {
      toast.error("Failed to clear expired sales");
    } finally {
      setIsClearingExpired(false);
    }
  };

  const columns: ColumnDef<ProductWithMeta>[] = [
    {
      id: "select",
      size: 40,
      header: ({ table }) => (
        <div className="w-10">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="w-10">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-12 h-12 shrink-0 bg-muted overflow-hidden rounded">
              {p.images[0] ? (
                <Image
                  src={p.images[0]}
                  alt={p.name}
                  fill
                  className="object-cover"
                  sizes="48px"

                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                  —
                </div>
              )}
            </div>
            <span className="font-medium">{p.name}</span>
            {p.isArchived ? (
              <Badge variant="secondary" className="shrink-0 text-muted-foreground">
                Archived
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    { accessorKey: "categoryLabel", header: "Category" },
    {
      id: "stock",
      header: "Stock",
      cell: ({ row }) => {
        const p = row.original;
        const low = productHasLowStock(p.variantStockRows, lowStockThreshold);
        return (
          <div
            className={low ? "rounded-md bg-amber-500/5 px-1 py-0.5 -mx-1 -my-0.5" : undefined}
            title={
              low
                ? `At least one variant has stock above 0 but below ${lowStockThreshold} units`
                : undefined
            }
          >
            <StockHoverCell
              totalStock={p.totalStock}
              variants={p.variantStockRows}
              lowStockThreshold={lowStockThreshold}
            />
          </div>
        );
      },
    },
    {
      id: "price",
      header: "Price",
      cell: ({ row }) => {
        const p = row.original;
        const price = typeof p.price === "string" ? p.price : String(p.price);
        const onSale = isProductOnSale(p);
        const displayPrice = getProductDisplayPrice(p);
        const discountPct = getProductDiscountPercent(p);
        return (
          <span className="flex items-center gap-2">
            {onSale ? (
              <>
                <span className="line-through text-muted-foreground">${price}</span>
                <span className="text-destructive font-medium">${displayPrice}</span>
                <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-destructive/20 text-destructive rounded">
                  Sale
                </span>
                {discountPct > 0 && (
                  <span className="text-[10px] text-muted-foreground">{discountPct}% OFF</span>
                )}
              </>
            ) : (
              `$${price}`
            )}
          </span>
        );
      },
    },
    { accessorKey: "colorLabel", header: "Color" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${row.original.isVisible
            ? "bg-muted text-foreground"
            : "bg-muted/50 text-muted-foreground"
            }`}
        >
          {row.original.isVisible ? "Visible" : "Hidden"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Link
              href={`/admin/products/${p.id}/edit`}
              className="whitespace-nowrap text-sm text-foreground hover:underline"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setRowActionsProduct(p)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
              aria-label={`More actions for ${p.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: products,
    columns,
    getRowId: (row) => String(row.id),
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="w-full sm:max-w-xs"
        />
        <Button onClick={handleSearch} variant="default" className="w-full shrink-0 sm:w-auto">
          Search
        </Button>
        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            {[
              { value: "all", label: "All categories" },
              ...categories.map((c) => ({ value: c.slug, label: c.label })),
            ].map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearExpiredSales}
          disabled={isClearingExpired}
          className="w-full shrink-0 sm:w-auto"
        >
          {isClearingExpired ? "Clearing…" : "Clear expired sales"}
        </Button>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg border border-border sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkArchive}
              disabled={isBulkArchiving}
            >
              {isBulkArchiving ? "Archiving…" : "Archive selected"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                openForceDeleteDialog(
                  selectedIds,
                  `${selectedCount} product${selectedCount !== 1 ? "s" : ""}`,
                )
              }
              disabled={isForceDeleting}
            >
              Force delete selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveDiscount}
              disabled={isRemoving}
            >
              {isRemoving ? "Removing…" : "Remove discount"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setDiscountModalOpen(true)}
              disabled={isApplying}
            >
              Apply discount
            </Button>
          </div>
        </div>
      )}

      <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-md border border-border">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No items found for this store. Add your first{" "}
                  <span>{storeTypeLabelEn(storeType === "formal" ? "formal" : "streetwear")}</span> item.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 overflow-visible">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={rowActionsProduct != null}
        onOpenChange={(open) => !open && setRowActionsProduct(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Product actions</DialogTitle>
          </DialogHeader>
          {rowActionsProduct && (
            <div className="flex flex-col gap-2 py-2">
              <p className="text-sm text-muted-foreground line-clamp-2">{rowActionsProduct.name}</p>
              {!rowActionsProduct.isArchived ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => {
                    const p = rowActionsProduct;
                    setRowActionsProduct(null);
                    void handleArchive(p.id, p.name);
                  }}
                >
                  Archive
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">This product is already archived.</p>
              )}
              <Button
                type="button"
                variant="destructive"
                className="w-full justify-center"
                onClick={() => {
                  const p = rowActionsProduct;
                  setRowActionsProduct(null);
                  openForceDeleteDialog([p.id], `"${p.name}"`);
                }}
              >
                Force delete…
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setRowActionsProduct(null)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={forceDeleteTarget != null}
        onOpenChange={(open) => !open && setForceDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Permanently delete {forceDeleteTarget?.summary ?? ""}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This cannot be undone. All variants, colours, and linked data that cascade will be removed. Products
            that appear on past orders cannot be deleted.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setForceDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void runForceDelete()}
              disabled={isForceDeleting}
            >
              {isForceDeleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discountModalOpen} onOpenChange={setDiscountModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply bulk discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="discount-percent" className="text-sm font-medium">
                Discount percentage
              </label>
              <Input
                id="discount-percent"
                type="number"
                min={1}
                max={99}
                placeholder="e.g. 20"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="sale-start" className="text-sm font-medium">
                  Start date (optional)
                </label>
                <Input
                  id="sale-start"
                  type="datetime-local"
                  value={saleStartDate}
                  onChange={(e) => setSaleStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="sale-end" className="text-sm font-medium">
                  End date (optional)
                </label>
                <Input
                  id="sale-end"
                  type="datetime-local"
                  value={saleEndDate}
                  onChange={(e) => setSaleEndDate(e.target.value)}
                />
              </div>
            </div>
            {previewProduct && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                <p className="font-medium mb-2">Preview</p>
                <p className="text-muted-foreground">
                  Original: ${previewOriginal.toFixed(2)} → New: $
                  {Number.isFinite(previewNew) ? previewNew.toFixed(2) : "—"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyDiscount}
              disabled={isApplying || !discountPercent.trim()}
            >
              {isApplying ? "Applying…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
