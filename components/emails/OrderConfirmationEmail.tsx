import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { orderNumberOrFallback } from "@/lib/order-reference";

export interface OrderConfirmationEmailProps {
  customerName: string;
  orderId: number;
  orderNumber: string;
  totalAmount: string;
  /** Full URL for guest account activation (optional). */
  activationLink?: string;
  /** Shown when guest checkout had an activation token but `NEXT_PUBLIC_APP_URL` was missing. */
  showActivationConfigNote?: boolean;
  addressLine1: string;
  city: string;
}

/**
 * Order confirmation + optional guest activation CTA (VAULT — minimal, high-contrast).
 */
export function OrderConfirmationEmail({
  customerName,
  orderId,
  orderNumber,
  totalAmount,
  activationLink,
  showActivationConfigNote,
  addressLine1,
  city,
}: OrderConfirmationEmailProps) {
  const orderRef = orderNumberOrFallback(orderNumber, orderId);
  const previewText = `Order ${orderRef} confirmed — thank you for shopping with VAULT`;

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brandWordmark}>VAULT</Text>
          </Section>

          <Heading style={h1}>Order confirmed</Heading>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>
            Thank you for your order. We&apos;ve received order{" "}
            <strong style={{ fontFamily: "ui-monospace, monospace" }}>{orderRef}</strong> and will
            prepare it for shipment.
          </Text>

          <Section style={summaryBox}>
            <Text style={summaryLabel}>Total</Text>
            <Text style={summaryAmount}>${totalAmount}</Text>
            <Text style={summaryMeta}>Payment: Cash on delivery (COD)</Text>
          </Section>

          <Text style={sectionTitle}>Delivery address</Text>
          <Text style={addressText}>
            {addressLine1}
            <br />
            {city}
          </Text>

          {activationLink ? (
            <Section style={ctaSection}>
              <Text style={ctaLead}>
                Create a password to track this order and speed up checkout next time.
              </Text>
              <Button href={activationLink} style={ctaButton}>
                Activate your account &amp; track order
              </Button>
              <Text style={ctaFinePrint}>This secure link expires in 24 hours.</Text>
            </Section>
          ) : null}

          {showActivationConfigNote ? (
            <Text style={configNote}>
              Account activation links require <code style={code}>NEXT_PUBLIC_APP_URL</code> to be set
              in your store environment.
            </Text>
          ) : null}

          <Hr style={hr} />
          <Text style={footer}>
            VAULT · Fashion delivered thoughtfully.
            <br />
            If you didn&apos;t place this order, please ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 24px 48px",
  maxWidth: "520px",
};

const brandBar = {
  marginBottom: "32px",
};

const brandWordmark = {
  margin: "0",
  fontSize: "13px",
  fontWeight: 700 as const,
  letterSpacing: "0.35em",
  color: "#0a0a0a",
};

const h1 = {
  color: "#0a0a0a",
  fontSize: "26px",
  fontWeight: 600 as const,
  lineHeight: "1.25",
  margin: "0 0 20px",
};

const text = {
  color: "#3f3f46",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const summaryBox = {
  backgroundColor: "#fafafa",
  border: "1px solid #e4e4e7",
  borderRadius: "8px",
  padding: "20px 20px 16px",
  margin: "24px 0",
};

const summaryLabel = {
  margin: "0 0 4px",
  fontSize: "11px",
  fontWeight: 600 as const,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#71717a",
};

const summaryAmount = {
  margin: "0 0 8px",
  fontSize: "28px",
  fontWeight: 600 as const,
  color: "#0a0a0a",
};

const summaryMeta = {
  margin: "0",
  fontSize: "13px",
  color: "#52525b",
};

const sectionTitle = {
  margin: "24px 0 8px",
  fontSize: "11px",
  fontWeight: 600 as const,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#71717a",
};

const addressText = {
  margin: "0",
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#3f3f46",
};

const ctaSection = {
  marginTop: "32px",
  padding: "24px",
  backgroundColor: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: "8px",
};

const ctaLead = {
  margin: "0 0 16px",
  fontSize: "15px",
  lineHeight: "1.55",
  color: "#422006",
};

const ctaButton = {
  backgroundColor: "#0a0a0a",
  borderRadius: "6px",
  color: "#fafafa",
  fontSize: "14px",
  fontWeight: 600 as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "14px 20px",
};

const ctaFinePrint = {
  margin: "14px 0 0",
  fontSize: "12px",
  color: "#78716c",
};

const configNote = {
  margin: "24px 0 0",
  fontSize: "12px",
  lineHeight: "1.5",
  color: "#71717a",
};

const code = {
  fontFamily: "ui-monospace, monospace",
  fontSize: "11px",
  backgroundColor: "#f4f4f5",
  padding: "2px 6px",
  borderRadius: "4px",
};

const hr = {
  borderColor: "#e4e4e7",
  margin: "32px 0 20px",
};

const footer = {
  color: "#a1a1aa",
  fontSize: "12px",
  lineHeight: "1.6",
  margin: "0",
};
