import { render } from "@react-email/render";
import { z } from "zod";
import { Resend } from "resend";
import { OrderConfirmationEmail } from "@/components/emails/OrderConfirmationEmail";
import {
  NewOrderStaffEmail,
  type StaffOrderLineItem,
} from "@/components/emails/NewOrderStaffEmail";
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

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
}

/** Comma- or semicolon-separated staff inboxes from `ORDER_NOTIFY_EMAIL`. Invalid entries are skipped. */
export function getOrderNotifyRecipients(): string[] {
  const raw = process.env.ORDER_NOTIFY_EMAIL?.trim();
  if (!raw) return [];
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[,;]/)) {
    const candidate = part.trim();
    if (!candidate) continue;
    const parsed = z.string().email().safeParse(candidate);
    if (!parsed.success) {
      logger.warn("ORDER_NOTIFY_EMAIL has invalid address, skipping", { candidate });
      continue;
    }
    const normalized = parsed.data.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    emails.push(parsed.data);
  }
  return emails;
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

    await resend.emails.send({
      from: getFromEmail(),
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

export type SendNewOrderStaffEmailParams = {
  orderId: number;
  orderNumber: string;
  totalAmount: string;
  customerName: string;
  phoneNumber: string;
  addressLine1: string;
  city: string;
  customerEmail?: string | null;
  lineItems: StaffOrderLineItem[];
  adminOrderUrl?: string;
};

/**
 * Notifies staff inboxes from ORDER_NOTIFY_EMAIL. Does not throw — logs failures for non-blocking checkout.
 */
export async function sendNewOrderStaffEmail(
  params: SendNewOrderStaffEmailParams,
): Promise<{ ok: true } | { ok: false }> {
  const recipients = getOrderNotifyRecipients();
  if (recipients.length === 0) return { ok: false };

  const resend = getResend();
  if (!resend) {
    logger.warn("RESEND_API_KEY missing — skipping staff order notification", {
      orderId: params.orderId,
    });
    return { ok: false };
  }

  try {
    const html = await render(
      NewOrderStaffEmail({
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        totalAmount: params.totalAmount,
        customerName: params.customerName,
        phoneNumber: params.phoneNumber,
        addressLine1: params.addressLine1,
        city: params.city,
        customerEmail: params.customerEmail,
        lineItems: params.lineItems,
        adminOrderUrl: params.adminOrderUrl,
      }),
    );

    await resend.emails.send({
      from: getFromEmail(),
      to: recipients,
      subject: `New order ${params.orderNumber} — VAULT`,
      html,
    });

    return { ok: true };
  } catch (err) {
    logger.error("Failed to send staff order notification email", err, { orderId: params.orderId });
    return { ok: false };
  }
}
