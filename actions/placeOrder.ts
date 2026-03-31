"use server";

import { randomUUID } from "crypto";
import { eq, and, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { cookies, headers } from "next/headers";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  orders,
  orderItems,
  productVariants,
  productColors,
  products,
  promoCodes,
  notifications,
} from "@/db/schema";
import { validatePromoInTransaction } from "@/actions/promo";
import { getProductDisplayPrice, getPublicSiteUrl, generateOrderNumber } from "@/lib/utils";
import { checkPlaceOrderLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { sendOrderConfirmationEmail } from "@/lib/resend";
import {
  ACTIVATION_ORDER_ID_COOKIE,
  ACTIVATION_TOKEN_COOKIE,
  getActivationCookieOptions,
} from "@/lib/order-activation-cookies";

const DEFAULT_SHIPPING_FEE = 5;

function isPostgresUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string };
  return e.code === "23505";
}

const cartItemSchema = z.object({
  productId: z.coerce.number(),
  size: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  priceAtPurchase: z.string(),
});

const placeOrderSchema = z.object({
  userId: z.string().nullable().optional(),
  guestEmail: z.string().email().nullable().optional(),
  /** Store only supports Cash on Delivery. */
  paymentMethod: z.literal("COD").default("COD"),
  customerName: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  addressLine1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  items: z.array(cartItemSchema).min(1, "Cart is empty"),
  promoCode: z.string().trim().optional(),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<
  | { success: false; error: string }
  | { orderId: number; orderNumber: string }
> {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
  const identifier = input.userId ?? input.guestEmail ?? ip;
  const limit = await checkPlaceOrderLimit(identifier, { auditIp: ip });
  if (!limit.allowed) {
    logger.warn("Rate limit exceeded for placeOrder", { identifier });
    return { success: false, error: "Too many requests. Please wait before trying again." };
  }

  const parseResult = placeOrderSchema.safeParse(input);
  if (!parseResult.success) {
    const firstError = parseResult.error.flatten().fieldErrors;
    const message = Object.entries(firstError)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
      .join("; ");
    logger.error("Place order validation failed", undefined, { ip, message });
    throw new Error(message);
  }

  const {
    userId: claimedUserId,
    guestEmail: guestEmailRaw,
    paymentMethod,
    customerName,
    phoneNumber,
    addressLine1,
    city,
    items,
    promoCode,
  } = parseResult.data;

  const { userId: sessionUserId } = await clerkAuth();
  const userId =
    claimedUserId && sessionUserId && claimedUserId === sessionUserId ? sessionUserId : undefined;

  const guestEmail = guestEmailRaw?.trim().toLowerCase() ?? null;
  const isGuestWithEmail = !userId && Boolean(guestEmail);
  const activationToken = isGuestWithEmail ? randomUUID() : null;
  const activationTokenExpires = isGuestWithEmail
    ? new Date(Date.now() + 24 * 60 * 60 * 1000)
    : null;

  const orderResult = await db.transaction(async (tx) => {
    const productIds = [...new Set(items.map((i) => i.productId))];
    const productRows = await tx
      .select()
      .from(products)
      .where(inArray(products.id, productIds));
    const productById = Object.fromEntries(productRows.map((p) => [p.id, p]));

    for (const pid of productIds) {
      const p = productById[pid];
      if (!p) {
        throw new Error(`Product #${pid} was not found`);
      }
      if (p.isArchived) {
        throw new Error(`"${p.name}" is no longer available for purchase`);
      }
    }

    const variantQuantities = new Map<
      string,
      { productId: number; size: string; quantity: number; priceAtPurchase: string }
    >();
    for (const item of items) {
      const key = `${item.productId}|${item.size}`;
      const product = productById[item.productId];
      const priceAtPurchase = product
        ? getProductDisplayPrice(product)
        : item.priceAtPurchase;
      const existing = variantQuantities.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        variantQuantities.set(key, {
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          priceAtPurchase,
        });
      }
    }

    for (const { productId, size, quantity } of variantQuantities.values()) {
      const variantResults = await tx
        .select()
        .from(productVariants)
        .where(and(eq(productVariants.productId, productId), eq(productVariants.size, size)));
      const variant = variantResults[0];

      if (!variant) {
        throw new Error(`Variant not found: product ${productId}, size ${size}`);
      }

      if (variant.stock < quantity) {
        const productResults = await tx
          .select({ name: products.name })
          .from(products)
          .where(eq(products.id, productId));
        const product = productResults[0];
        const productName = product?.name ?? `Product #${productId}`;
        throw new Error(
          `Insufficient stock for "${productName}" size ${size}. Available: ${variant.stock}, requested: ${quantity}`
        );
      }

      const newStock = variant.stock - quantity;

      await tx
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} - ${quantity}` })
        .where(eq(productVariants.id, variant.id));

      if (newStock < 5) {
        const existingAlert = await tx
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(
              eq(notifications.variantId, variant.id),
              eq(notifications.isRead, false),
              eq(notifications.type, "LOW_STOCK"),
            ),
          )
          .limit(1);

        if (existingAlert.length === 0) {
          const metaRows = await tx
            .select({
              productName: products.name,
              colorName: productColors.name,
            })
            .from(productVariants)
            .innerJoin(productColors, eq(productVariants.colorId, productColors.id))
            .innerJoin(products, eq(productVariants.productId, products.id))
            .where(eq(productVariants.id, variant.id))
            .limit(1);
          const m = metaRows[0];
          const productName = m?.productName ?? `Product #${productId}`;
          const colorName = m?.colorName ?? "—";
          const message = `Low stock alert: ${productName} (${colorName}, Size ${size}) only has ${newStock} unit${newStock === 1 ? "" : "s"} left.`;

          await tx.insert(notifications).values({
            type: "LOW_STOCK",
            message,
            productId,
            variantId: variant.id,
            isRead: false,
          });
        }
      }
    }

    const subtotalAmount = Array.from(variantQuantities.values()).reduce(
      (sum, { quantity, priceAtPurchase }) => sum + quantity * parseFloat(priceAtPurchase),
      0
    );

    let discountAmount = 0;
    let promoCodeId: number | null = null;
    const shippingFee = DEFAULT_SHIPPING_FEE;

    if (promoCode?.trim()) {
      const validated = await validatePromoInTransaction(
        tx,
        promoCode.trim(),
        subtotalAmount,
        shippingFee
      );
      discountAmount = validated.discountAmount;
      promoCodeId = validated.promoCodeId;
    }

    const totalAmount = Math.max(0, subtotalAmount - discountAmount + shippingFee);

    let order: { id: number; orderNumber: string } | undefined;
    for (let attempt = 0; attempt < 8; attempt++) {
      const orderNumber = generateOrderNumber();
      try {
        const [row] = await tx
          .insert(orders)
          .values({
            orderNumber,
            userId: userId ?? null,
            guestEmail,
            customerName,
            phoneNumber,
            addressLine1,
            city,
            subtotalAmount: subtotalAmount.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            shippingFee: shippingFee.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            promoCodeId,
            status: "PENDING",
            paymentMethod,
            activationToken,
            activationTokenExpires,
          })
          .returning({ id: orders.id, orderNumber: orders.orderNumber });

        if (row) {
          order = row;
          break;
        }
      } catch (e) {
        if (isPostgresUniqueViolation(e)) {
          continue;
        }
        throw e;
      }
    }

    if (!order) {
      throw new Error("Could not assign a unique order number; please try again.");
    }

    if (promoCodeId != null) {
      await tx
        .update(promoCodes)
        .set({ currentUses: sql`${promoCodes.currentUses} + 1` })
        .where(eq(promoCodes.id, promoCodeId));
    }

    const orderItemsToInsert = items.map((item) => {
      const key = `${item.productId}|${item.size}`;
      const vq = variantQuantities.get(key);
      const priceAtPurchase = vq?.priceAtPurchase ?? item.priceAtPurchase;
      return {
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
        priceAtPurchase,
      };
    });

    await tx.insert(orderItems).values(orderItemsToInsert);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: totalAmount.toFixed(2),
      guestEmail,
      activationToken,
    };
  });

  const cookieStore = await cookies();
  const cookieOpts = getActivationCookieOptions();
  cookieStore.set(ACTIVATION_ORDER_ID_COOKIE, String(orderResult.orderId), cookieOpts);
  if (orderResult.activationToken) {
    cookieStore.set(ACTIVATION_TOKEN_COOKIE, orderResult.activationToken, cookieOpts);
  }

  const emailTo = orderResult.guestEmail || undefined;
  if (emailTo) {
    const baseUrl = getPublicSiteUrl();
    const activationLink =
      orderResult.activationToken && baseUrl
        ? `${baseUrl}/api/auth/verify?token=${encodeURIComponent(orderResult.activationToken)}&orderId=${orderResult.orderId}`
        : undefined;

    void sendOrderConfirmationEmail({
      to: emailTo,
      customerName,
      orderId: orderResult.orderId,
      orderNumber: orderResult.orderNumber,
      totalAmount: orderResult.totalAmount,
      addressLine1,
      city,
      activationLink,
      showActivationConfigNote: Boolean(orderResult.activationToken && !baseUrl),
    });
  }

  return {
    orderId: orderResult.orderId,
    orderNumber: orderResult.orderNumber,
  };
}
