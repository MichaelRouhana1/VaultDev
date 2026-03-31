import { Link } from "@/i18n/navigation";
import { PromoCodeForm } from "@/components/PromoCodeForm";
import { requireAdmin } from "@/lib/security";

export default async function NewPromoPage() {
  await requireAdmin();

  return (
    <div>
      <Link
        href="/admin/promos"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← Back to promo codes
      </Link>
      <h1 className="text-2xl font-bold mb-8">Add Promo Code</h1>
      <PromoCodeForm />
    </div>
  );
}
