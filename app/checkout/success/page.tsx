import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { orders } from "@/db/schema";

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const orderIdParam = params.orderId;
  const id = orderIdParam ? parseInt(orderIdParam, 10) : NaN;
  const { userId } = await auth();

  let displayOrderId: number | null = null;
  if (Number.isInteger(id) && id > 0 && userId) {
    const [order] = await db.select({ userId: orders.userId }).from(orders).where(eq(orders.id, id)).limit(1);
    if (order && order.userId === userId) {
      displayOrderId = id;
    }
  }

  return (
    <div className="pt-14">
    <div className="container mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Order confirmed</h1>
      {displayOrderId != null ? (
        <p className="text-muted-foreground">
          Your order <strong>#{displayOrderId}</strong> has been placed successfully.
        </p>
      ) : (
        <p className="text-muted-foreground">
          Your order has been placed successfully.
        </p>
      )}
      <Button asChild>
        <Link href="/">Continue shopping</Link>
      </Button>
    </div>
    </div>
  );
}
