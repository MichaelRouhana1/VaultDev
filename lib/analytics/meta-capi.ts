import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import {
  META_PIXEL_CURRENCY,
  metaMoney,
  metaPurchaseEventId,
  type MetaContent,
} from "@/lib/analytics/meta-commerce";

const GRAPH_VERSION = "v21.0";

export type MetaPurchaseInput = {
  orderId: number;
  /** Order total in USD, after discount and shipping. */
  totalAmountUsd: string;
  contents: MetaContent[];
  email?: string | null;
  phone?: string | null;
  customerName?: string | null;
  city?: string | null;
  externalId?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  eventSourceUrl?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashEmail(email: string | null | undefined): string | undefined {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return undefined;
  return sha256(normalized);
}

function hashPhone(phone: string | null | undefined): string | undefined {
  const digits = phone?.replace(/\D/g, "");
  if (!digits) return undefined;
  return sha256(digits);
}

function hashExternalId(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  return sha256(normalized);
}

/** Lowercase letters only, per Meta's name / city normalization. */
function hashText(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase().replace(/[^\p{L}]/gu, "");
  if (!normalized) return undefined;
  return sha256(normalized);
}

function splitName(customerName: string | null | undefined): {
  first?: string;
  last?: string;
} {
  const parts = customerName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return {};
  return {
    first: parts[0],
    last: parts.length > 1 ? parts.slice(1).join("") : undefined,
  };
}

function absoluteHttpUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/**
 * Server Purchase for the Conversions API. Same `event_id` as the browser pixel
 * so Meta counts the order once. Never throws; skips when the token or pixel id is unset.
 */
export async function sendMetaPurchase(input: MetaPurchaseInput): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!pixelId || !/^\d+$/.test(pixelId) || !accessToken) return;

  const name = splitName(input.customerName);
  const userData: Record<string, string | string[]> = {};
  const em = hashEmail(input.email);
  const ph = hashPhone(input.phone);
  const fn = hashText(name.first);
  const ln = hashText(name.last);
  const ct = hashText(input.city);
  const externalId = hashExternalId(input.externalId);
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = [fn];
  if (ln) userData.ln = [ln];
  if (ct) userData.ct = [ct];
  if (externalId) userData.external_id = [externalId];
  if (input.clientIpAddress && input.clientIpAddress !== "unknown") {
    userData.client_ip_address = input.clientIpAddress;
  }
  if (input.clientUserAgent?.trim()) {
    userData.client_user_agent = input.clientUserAgent.trim();
  }
  if (input.fbp?.trim()) userData.fbp = input.fbp.trim();
  if (input.fbc?.trim()) userData.fbc = input.fbc.trim();

  const numItems = input.contents.reduce((sum, line) => sum + line.quantity, 0);
  const event: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: metaPurchaseEventId(input.orderId),
    action_source: "website",
    user_data: userData,
    custom_data: {
      currency: META_PIXEL_CURRENCY,
      value: metaMoney(parseFloat(input.totalAmountUsd)),
      content_ids: input.contents.map((line) => line.id),
      content_type: "product",
      contents: input.contents,
      num_items: numItems,
      order_id: String(input.orderId),
    },
  };
  const sourceUrl = absoluteHttpUrl(input.eventSourceUrl);
  if (sourceUrl) event.event_source_url = sourceUrl;

  const body: { data: Record<string, unknown>[]; test_event_code?: string } = {
    data: [event],
  };
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();
  if (testEventCode) body.test_event_code = testEventCode;

  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      logger.warn("Meta CAPI purchase was rejected", {
        orderId: input.orderId,
        status: response.status,
      });
    }
  } catch {
    logger.warn("Meta CAPI purchase failed", { orderId: input.orderId });
  }
}
