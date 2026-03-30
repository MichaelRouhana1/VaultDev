import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function PriceInput({ defaultValue }: { defaultValue?: string }) {
    return (
        <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                defaultValue={defaultValue}
            />
        </div>
    );
}
