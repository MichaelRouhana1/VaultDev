import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLegalContactEmail } from "@/lib/legal-contact-email";

/** Update when these Terms change materially (displayed on the public page). */
const TERMS_LAST_UPDATED = "3 April 2026";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "TermsPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function ContactLine() {
  const email = getLegalContactEmail();
  return (
    <a
      href={`mailto:${email}`}
      className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
    >
      {email}
    </a>
  );
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="pt-14">
      <article className="mx-auto max-w-3xl px-6 py-16 text-sm leading-relaxed text-foreground/90">
        <h1 className="mb-2 text-2xl font-normal tracking-tight text-foreground">Terms of Service</h1>
        <p className="mb-10 text-xs text-foreground/60">
          Last updated: {TERMS_LAST_UPDATED} · Operator: Vault — <strong>not a registered legal entity</strong> (no commercial registration)
        </p>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">1. Agreement</h2>
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Vault website and any purchase of physical goods offered
            through it (&quot;Service&quot;). By accessing the Service, creating an account, or placing an order, you agree to these Terms and to our{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:opacity-80">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">2. Operator</h2>
          <p>
            The Service is operated by <strong>Vault</strong>, an online retail business offering streetwear and classic wear.{" "}
            <strong>Vault is not registered</strong> as a company, commercial enterprise, or other separate legal entity for this activity in Lebanon.
            These Terms are entered into with Vault as the operating brand in that <strong>unincorporated</strong> capacity. We{" "}
            <strong>do not publish a commercial registration number or registered company address</strong> because none applies; use the contact details
            below for all inquiries.
          </p>
          <p>
            <strong>Contact:</strong> <ContactLine />
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">3. Eligibility</h2>
          <p>
            You must be at least <strong>18 years of age</strong>, or have obtained the <strong>consent of a parent or legal guardian</strong>, to use
            the Service and to enter into a binding contract for purchases. By using the Service you represent that you meet this requirement.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">4. Accounts and security</h2>
          <p>
            Accounts are provided through <strong>Clerk</strong> (authentication). You are responsible for maintaining the confidentiality of your
            login credentials and for all activity under your account. Notify us promptly at the contact above if you suspect unauthorized access. We
            may suspend or terminate accounts that violate these Terms or pose a security risk.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">5. Products and pricing</h2>
          <p>
            Product descriptions, images, and availability are provided for information purposes. We aim for accuracy but do not warrant that
            descriptions are error-free. Prices are displayed in <strong>United States Dollars (USD)</strong>, <strong>Lebanese Lira (LBP)</strong>,
            and/or <strong>Euros (EUR)</strong> for convenience; underlying catalog values are handled in accordance with our storefront configuration.
          </p>
          <p>
            <strong>We reserve the right to change prices, discounts, and product listings</strong> at any time without prior notice. The price
            charged will be the price in effect at the time you complete checkout, subject to order acceptance below.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">6. Orders and acceptance</h2>
          <p>
            Placing an order constitutes an offer to purchase. <strong>We reserve the right to refuse, limit, or cancel any order</strong> before
            dispatch, including but not limited to cases of suspected fraud or abuse, obvious pricing or stock errors, unavailability of goods, or
            failure to meet eligibility or verification requirements. If we cancel an order after payment obligations arise, any applicable refund will
            be handled in line with these Terms and applicable law.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">7. Payment — Cash on Delivery (COD)</h2>
          <p>
            Unless another method is expressly offered at checkout, <strong>payment is primarily by Cash on Delivery (COD)</strong>. For COD orders,{" "}
            <strong>payment must be made in full at the moment of delivery</strong> to the courier or representative we authorize.
          </p>
          <p>
            <strong>We reserve the right to verify your telephone number</strong> (and other contact details you provide) <strong>before dispatching</strong>{" "}
            the order, to confirm delivery arrangements and reduce failed deliveries or fraud.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">8. Digital confirmation and invoice</h2>
          <p>
            In line with requirements applicable to digital transactions, we send a <strong>digital order confirmation by email</strong> as soon as
            your order completes. It includes your <strong>order reference</strong>, <strong>totals</strong>, <strong>payment method</strong> (e.g.
            COD), and <strong>delivery details</strong>, and serves as your <strong>transaction record</strong> for that purchase. Messages are
            delivered through <strong>Resend</strong>. Where Lebanese tax or accounting law requires a <strong>separate formal tax invoice</strong>{" "}
            (with additional seller or VAT information), we will provide it when applicable.
          </p>
          <p>
            You should <strong>keep the email for your records</strong>. If you do not receive it, check spam or junk folders and contact us using the
            details in §2. Email delivery depends on a working email integration in our production environment; if sending fails despite our reasonable
            efforts, we will work with you to confirm your order by other reasonable means.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">9. Delivery</h2>
          <p>
            Delivery timeframes and fees, where shown, are <strong>estimates only</strong> and are not guaranteed. Delays may occur due to logistics,
            weather, customs (if applicable), or events outside our reasonable control.
          </p>
          <p>
            <strong>Risk of loss and title</strong> to the products pass to you <strong>upon delivery</strong> of the goods to the address or handover
            point agreed for your order, except where mandatory law provides otherwise.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">10. Right to cancel — distance sales (10 days)</h2>
          <p>
            Under <strong>Lebanese Consumer Protection Law</strong> and <strong>Law No. 81/2018</strong> on electronic transactions and related
            consumer protections for <strong>distance contracts</strong>, you have a statutory <strong>right to withdraw</strong> from your purchase.
          </p>
          <p>
            <strong>
              In accordance with Lebanese Consumer Protection Law, you have the right to cancel your purchase within 10 days of receiving the
              product.
            </strong>{" "}
            To exercise this right, <strong>the product must be unused and in its original packaging</strong>, with tags intact where applicable, and
            in a resalable condition. You must follow our return instructions and any reasonable verification we require.
          </p>
          <p>
            To exercise this right, notify us <strong>within the 10-day period</strong> using the <strong>contact details in §2</strong>, with your{" "}
            <strong>order reference</strong> (and any information we reasonably need to identify the purchase). We may provide or require a specific
            returns process (for example a return address or courier instruction); until published, email is the primary channel.
          </p>
          <p>
            <strong>Custom-made, personalized, or clearly bespoke orders</strong> may be <strong>excluded</strong> from the right of withdrawal except
            where the item is defective or not as described, or where mandatory law grants you a remedy. If an order is identified as custom at
            checkout, that status will govern.
          </p>
          <p>
            Exercising your cancellation or return right may require us to <strong>process your personal data</strong> (for example order references,
            contact details, and delivery records) to arrange collection, inspection, refund, or exchange. See our{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:opacity-80">
              Privacy Policy
            </Link>{" "}
            for how we handle personal data.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">11. Prohibited conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 ps-5">
            <li>Use the Service for any unlawful purpose or in violation of these Terms;</li>
            <li>
              Use automated means (including bots, scrapers, or crawlers) to access, collect, or interact with the Service in a way that could harm,
              overload, or circumvent our systems;
            </li>
            <li>
              Attempt to interfere with, disable, or bypass <strong>rate limiting, security controls, or access restrictions</strong> (including those
              implemented with <strong>Upstash</strong> or comparable infrastructure);
            </li>
            <li>Misrepresent your identity, manipulate orders, or abuse promotions.</li>
          </ul>
          <p>We may investigate violations and cooperate with authorities where appropriate.</p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">12. Third-party services</h2>
          <p>
            The Service relies on third-party providers (including <strong>Clerk</strong> for authentication, <strong>Resend</strong> for email,{" "}
            <strong>Upstash</strong> for rate limiting, <strong>Vercel</strong> for hosting, and payment or logistics partners as applicable). Their
            services are subject to their own terms and policies. We are not responsible for third-party services outside our reasonable control.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">13. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by the <strong>laws of the Republic of Lebanon</strong>, Vault shall not be liable for indirect, incidental,
            consequential, or punitive damages, or for loss of profits or data, arising from your use of the Service.
          </p>
          <p>
            <strong>
              Vault is not liable for service interruptions caused by our third-party providers (including Clerk, Vercel, and Upstash) or for local
              internet outages or telecommunications issues in Lebanon
            </strong>
            , except where mandatory law prohibits such exclusion or limitation. Nothing in these Terms excludes or limits liability for death or
            personal injury caused by negligence, fraud, or other liability that cannot be excluded under applicable law.
          </p>
          <p>
            Our total aggregate liability for any claim relating to the Service or a single order is, where the law allows, limited to the amount you
            paid for the relevant order.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">14. Governing law and disputes</h2>
          <p>
            These Terms are governed by the <strong>laws of the Republic of Lebanon</strong>, without regard to conflict-of-law rules that would refer
            to another jurisdiction.
          </p>
          <p>
            <strong>Any dispute arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts
            of Lebanon.</strong> You agree to submit to that jurisdiction, subject to any non-waivable rights you may have under mandatory consumer
            protection rules.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">15. Changes</h2>
          <p>
            We may modify these Terms from time to time. The &quot;Last updated&quot; date will change when we do. Continued use of the Service after
            changes constitutes acceptance of the updated Terms, except where applicable law requires a different process for material changes.
          </p>
        </section>

        <p className="mt-12 border-t border-border pt-8 text-xs text-foreground/60">
          These Terms are provided for transparency and do not constitute legal advice. Have qualified counsel in Lebanon review them for your
          specific business, products, and channels.
        </p>
      </article>
    </div>
  );
}
