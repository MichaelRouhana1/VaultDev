import { render } from "@react-email/render";
import { Resend } from "resend";
import { OrderConfirmationEmail } from "@/components/emails/OrderConfirmationEmail";
import { logger } from "@/lib/logger";

let resendClient: Resend | null | undefined;

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (resendClient === undefined) {
    resendClient = new Resend(key);
  }
  return resendClient;
}

export type SendOrderConfirmationParams = {
  to: string;
  customerName: string;
  orderId: number;
  orderNumber: string;
  totalAmount: string;
  addressLine1: string;
  city: string;
  activationLink?: string;
  showActivationConfigNote?: boolean;
};

/**
 * Sends order confirmation HTML via Resend. Does not throw — logs failures for non-blocking checkout.
 */
export async function sendOrderConfirmationEmail(
  params: SendOrderConfirmationParams,
): Promise<{ ok: true } | { ok: false }> {
  const resend = getResend();
  if (!resend) {
    logger.warn("RESEND_API_KEY missing — skipping order confirmation email", {
      orderId: params.orderId,
    });
    return { ok: false };
  }

  try {
    const html = await render(
      OrderConfirmationEmail({
        customerName: params.customerName,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        totalAmount: params.totalAmount,
        activationLink: params.activationLink,
        showActivationConfigNote: params.showActivationConfigNote,
        addressLine1: params.addressLine1,
        city: params.city,
      }),
    );

    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

    await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: `Order ${params.orderNumber} confirmed — VAULT`,
      html,
    });

    return { ok: true };
  } catch (err) {
    logger.error("Failed to send order confirmation email", err, { orderId: params.orderId });
    return { ok: false };
  }
}
