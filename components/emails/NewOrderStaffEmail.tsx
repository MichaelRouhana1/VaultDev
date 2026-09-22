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

export type StaffOrderLineItem = {
  name: string;
  size: string;
  quantity: number;
};

export interface NewOrderStaffEmailProps {
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
}

/**
 * Internal alert for a new COD order (not sent to the customer).
 */
export function NewOrderStaffEmail({
  orderId,
  orderNumber,
  totalAmount,
  customerName,
  phoneNumber,
  addressLine1,
  city,
  customerEmail,
  lineItems,
  adminOrderUrl,
}: NewOrderStaffEmailProps) {
  const orderRef = orderNumberOrFallback(orderNumber, orderId);
  const previewText = `New order ${orderRef} — $${totalAmount} COD`;

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brandWordmark}>VAULT</Text>
          </Section>

          <Heading style={h1}>New order</Heading>
          <Text style={text}>
            Order{" "}
            <strong style={{ fontFamily: "ui-monospace, monospace" }}>{orderRef}</strong> was
            just placed (cash on delivery).
          </Text>

          <Section style={summaryBox}>
            <Text style={summaryLabel}>Total</Text>
            <Text style={summaryAmount}>${totalAmount}</Text>
            <Text style={summaryMeta}>Payment: Cash on delivery (COD)</Text>
          </Section>

          <Text style={sectionTitle}>Customer</Text>
          <Text style={addressText}>
            {customerName}
            <br />
            {phoneNumber}
            {customerEmail ? (
              <>
                <br />
                {customerEmail}
              </>
            ) : null}
          </Text>

          <Text style={sectionTitle}>Delivery address</Text>
          <Text style={addressText}>
            {addressLine1}
            <br />
            {city}
          </Text>

          {lineItems.length > 0 ? (
            <>
              <Text style={sectionTitle}>Items</Text>
              {lineItems.map((item, index) => (
                <Text key={`${item.name}-${item.size}-${index}`} style={itemText}>
                  {item.quantity}× {item.name} ({item.size})
                </Text>
              ))}
            </>
          ) : null}

          {adminOrderUrl ? (
            <Section style={ctaSection}>
              <Button href={adminOrderUrl} style={ctaButton}>
                Open order in admin
              </Button>
            </Section>
          ) : null}

          <Hr style={hr} />
          <Text style={footer}>Internal VAULT notification — not sent to the customer.</Text>
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

const itemText = {
  margin: "0 0 6px",
  fontSize: "15px",
  lineHeight: "1.5",
  color: "#3f3f46",
};

const ctaSection = {
  marginTop: "32px",
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
