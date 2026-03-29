"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  StockHoverCell,
  LOW_STOCK_THRESHOLD,
  productHasLowStock,
  type StockByColorRow,
} from "./StockHoverCell";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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
import { deleteProduct } from "@/actions/deleteProduct";
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
  stockBySize?: Record<string, number>;
  stockByColor?: StockByColorRow[];
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
}

export function ProductsTable({
  products,
  initialQuery = "",
  initialCategory = "all",
  categories,
  storeType = "streetwear",
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
    if (!confirm(`Archive "${name}"? It will disappear from the storefront but stay in the admin list and order history.`))
      return;
    const archived = await deleteProduct(id);
    if (archived.success === false) {
      toast.error(archived.error);
      return;
    }
    toast.success("Product archived");
    router.refresh();
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
        const low = productHasLowStock(p.stockByColor, p.stockBySize ?? {}, LOW_STOCK_THRESHOLD);
        return (
          <div
            className={low ? "rounded-md bg-amber-500/5 px-1 py-0.5 -mx-1 -my-0.5" : undefined}
            title={low ? "At least one variant is below 5 units" : undefined}
          >
            <StockHoverCell
              totalStock={p.totalStock}
              stockBySize={p.stockBySize ?? {}}
              stockByColor={p.stockByColor}
              lowStockThreshold={LOW_STOCK_THRESHOLD}
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
          <div className="text-right">
            <Link
              href={`/admin/products/${p.id}/edit`}
              className="text-foreground hover:underline mr-4"
            >
              Edit
            </Link>
            {p.isArchived ? (
              <span className="text-xs text-muted-foreground">Archived</span>
            ) : (
              <button
                type="button"
                onClick={() => handleArchive(p.id, p.name)}
                className="text-destructive hover:underline"
              >
                Archive
              </button>
            )}
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
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="w-full sm:max-w-xs"
        />
        <Button onClick={handleSearch} variant="default">
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
        >
          {isClearingExpired ? "Clearing…" : "Clear expired sales"}
        </Button>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border border-border">
          <span className="text-sm font-medium">
            {selectedCount} product{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveDiscount}
              disabled={isRemoving}
            >
              {isRemoving ? "Removing…" : "Remove Discount"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setDiscountModalOpen(true)}
              disabled={isApplying}
            >
              Apply Discount
            </Button>
          </div>
        </div>
      )}

      <div className="border border-border rounded-md overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
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
                  No items found for this store. Add your first <span className="capitalize">{storeType}</span> item.
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
