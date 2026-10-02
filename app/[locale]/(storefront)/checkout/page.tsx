import { getTranslations } from "next-intl/server";
import { CheckoutForm } from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const t = await getTranslations("CheckoutPage");

  return (
    <div className="pt-14">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold">{t("title")}</h1>
        <CheckoutForm />
      </div>
    </div>
  );
}
