import { Input } from "@/components/ui/input";
import type { ColorEntry } from "@/components/admin/ImageUploader";

/**
 * Client-only grid for editing per-size stock. Submitted stock is persisted and logged as
 * `STOCK_OVERRIDE` in Security logs when the product form saves via `updateProduct`.
 */
interface InventoryManagerProps {
    colors: ColorEntry[];
    sizes: readonly string[];
    updateColor: (id: string, updates: Partial<Omit<ColorEntry, "id">>) => void;
}

export function InventoryManager({ colors, sizes, updateColor }: InventoryManagerProps) {
    if (colors.length === 0) return null;

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-medium">Stock by color &amp; size</h3>
                <p className="text-xs text-muted-foreground">
                    Set inventory for each color and size combination
                </p>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted">
                        <tr>
                            <th className="text-left p-3 font-medium">Color</th>
                            {sizes.map((s) => (
                                <th key={s} className="p-3 font-medium text-center">
                                    {s}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {colors.map((color) => (
                            <tr key={color.id} className="border-t border-border">
                                <td className="p-3 font-medium">{color.name || "—"}</td>
                                {sizes.map((size) => (
                                    <td key={size} className="p-2">
                                        <Input
                                            type="number"
                                            aria-label={`Stock for ${color.name} size ${size}`}
                                            min={0}
                                            value={color.stockBySize[size] ?? 0}
                                            onChange={(e) =>
                                                updateColor(color.id, {
                                                    stockBySize: {
                                                        ...color.stockBySize,
                                                        [size]: Math.max(0, parseInt(e.target.value, 10) || 0),
                                                    },
                                                })
                                            }
                                            className="h-8 w-16 text-center"
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
