import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLegalContactEmail } from "@/lib/legal-contact-email";

/** Update when this policy changes materially (displayed on the public page). */
const PRIVACY_POLICY_LAST_UPDATED = "3 April 2026";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "PrivacyPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function PrivacyContactLine() {
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

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="pt-14">
      <article className="mx-auto max-w-3xl px-6 py-16 text-sm leading-relaxed text-foreground/90">
        <h1 className="mb-2 text-2xl font-normal tracking-tight text-foreground">Privacy Policy</h1>
        <p className="mb-10 text-xs text-foreground/60">
          Last updated: {PRIVACY_POLICY_LAST_UPDATED} · Operator: Vault — <strong>not a registered legal entity</strong> (no commercial registration)
        </p>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">1. Who we are</h2>
          <p>
            <strong>Vault</strong> operates this website and online shop. References to &quot;we&quot;, &quot;us&quot;, and &quot;our&quot; mean Vault in
            that capacity. <strong>Vault is not registered</strong> as a company, commercial enterprise, or other separate legal entity for this
            activity in Lebanon. We therefore <strong>do not have a commercial registration number, registered company name, or registered business
            address</strong> to publish here; use the privacy contact below to reach us.
          </p>
          <p>
            <strong>Privacy contact:</strong> <PrivacyContactLine />
          </p>
          <p>
            Use this contact for <strong>access, correction, deletion, and other privacy requests</strong> described in{" "}
            <a href="#your-rights" className="underline underline-offset-4 hover:opacity-80">
              Your rights
            </a>
            . We may ask you to verify your identity before acting on a request. We respond within a reasonable time, subject to legal limits on what
            we can delete or change (for example finalized transaction records we are allowed to keep in anonymized form).
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">2. Lebanese law and your consent</h2>
          <p>
            This policy is designed to align with <strong>Law No. 81/2018</strong> (Electronic Transactions and Personal Data) and the{" "}
            <strong>Consumer Protection Law</strong> of Lebanon, among other applicable rules. Nothing here limits any stronger right you may have
            under local law.
          </p>
          <p>
            <strong>Legal basis — explicit consent:</strong> By <strong>using this website</strong> (including browsing with cookies or similar
            technologies where applicable) <strong>and/or placing an order</strong>, you provide <strong>explicit consent</strong> to the collection
            and processing of your personal data as described in this Privacy Policy. If you do not agree, please do not use the site or submit an
            order.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">3. Returns, cancellation, and the 10-day rule</h2>
          <p>
            Under Lebanese consumer protection rules, you may have a <strong>right to cancel or return</strong> certain purchases within a statutory
            period (often discussed as <strong>10 days</strong> for distance contracts — see our{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:opacity-80">
              Terms of Service
            </Link>{" "}
            for the conditions that apply to Vault).
          </p>
          <p>
            If you exercise that right, we will <strong>process the personal data needed</strong> to handle your <strong>cancellation, return,
            refund, or exchange</strong> (for example order references, contact details, delivery information, and records of the goods). That
            processing is part of fulfilling our legal and contractual obligations. Details also appear in our{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:opacity-80">
              Terms of Service
            </Link>
            .
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">4. Data we collect</h2>
          <p>
            <strong>Account and authentication (Clerk).</strong> We use Clerk as our authentication provider. Clerk processes data such as your
            account identifier, email address, session and security data, and, depending on what you provide, your name or profile image. See{" "}
            <a
              href="https://clerk.com/legal/privacy"
              className="underline underline-offset-4 hover:opacity-80"
              target="_blank"
              rel="noopener noreferrer"
            >
              Clerk&apos;s privacy policy
            </a>
            .
          </p>
          <p>
            <strong>Orders and order history.</strong> When you checkout we collect what you submit: name, phone number, delivery address (including at
            least address line and city), and for guest orders an email address where applicable. We store each order&apos;s reference, line items
            (products, sizes, quantities, prices at purchase), amounts (subtotal, discounts, shipping, total), payment method (e.g. cash on delivery),
            promotional code usage where relevant, timestamps, and a link to your Clerk user ID when you are signed in. Together, these records form
            your <strong>order history</strong> in our systems (what you bought, when, and for how much), linked to you when you use an account or
            identified by the contact details you gave as a guest.
          </p>
          <p>
            <strong>Wishlist.</strong> For signed-in users we store your user ID and the product IDs you save.
          </p>
          <p>
            <strong>Security and audit logs.</strong> We may record technical and administrative events, including user identifiers where relevant,
            IP addresses, timestamps, and structured details (sometimes including email in security or account-deletion workflows).
          </p>
          <p>
            <strong>Transactional email (Resend).</strong> We use{" "}
            <a href="https://resend.com/legal/privacy-policy" className="underline underline-offset-4 hover:opacity-80" target="_blank" rel="noopener noreferrer">
              Resend
            </a>{" "}
            to send <strong>transactional emails</strong>, including <strong>order confirmations</strong>. Resend receives the recipient address and
            the content of those messages.
          </p>
          <p>
            <strong>Locale, currency, and storefront preferences.</strong> Your <strong>language/locale</strong> is reflected in the site URL (e.g.{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">/en</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">/fr</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">/ar</code>) and may be supported by <strong>cookies</strong> used for internationalization. Your
            preferred <strong>storefront</strong> (e.g. streetwear vs formal) may be stored in a <strong>cookie</strong> to keep routing consistent.
            Your <strong>display currency</strong> preference (<strong>USD, EUR, or LBP</strong>) is stored in your browser&apos;s{" "}
            <strong>local storage</strong> so prices stay consistent between visits (this is not a server-side profile).
          </p>
          <p>
            <strong>Guest wishlist.</strong> Before you sign in, product IDs may be kept in browser local storage and merged into your account
            wishlist after login.
          </p>
          <p>
            <strong>Other cookies.</strong> We use cookies for sign-in sessions (Clerk), short-lived HttpOnly cookies for guest order activation where
            that flow is used, and admin-only cookies for staff.
          </p>
          <p>
            <strong>Rate limiting.</strong> When configured, we use Upstash Redis to limit abuse; this can involve processing IP addresses and
            operation-specific keys.
          </p>
          <p>
            <strong>Hosting.</strong> The application is hosted on{" "}
            <a href="https://vercel.com/legal/privacy-policy" className="underline underline-offset-4 hover:opacity-80" target="_blank" rel="noopener noreferrer">
              Vercel
            </a>
            , which processes typical request metadata and logs. Our database and media storage providers process data needed to run the shop.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">5. International transfers</h2>
          <p>
            <strong>Your data may be processed on servers located outside of Lebanon</strong> (for example in the <strong>European Union</strong>, the{" "}
            <strong>United States</strong>, or other regions) by Vault and by our subprocessors, including{" "}
            <strong>Vercel</strong>, <strong>Clerk</strong>, <strong>Resend</strong>, and <strong>Upstash</strong> (when used), as well as our database and file-storage providers. Those transfers are
            carried out to operate the service; subprocessors&apos; own terms and privacy notices apply to their processing.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">6. Why we use your data</h2>
          <p>
            We process personal data to operate accounts and sign-in, process and deliver orders, send transactional emails, provide wishlists and
            promotions, support guest-to-account linking where offered, secure the site (including rate limits and audit logs), and comply with legal,
            tax, and consumer-protection obligations.
          </p>
        </section>

        <section id="your-rights" className="mt-10 scroll-mt-24 space-y-3">
          <h2 className="text-base font-semibold text-foreground">7. Your rights</h2>
          <p>
            Subject to <strong>Law No. 81/2018</strong>, the <strong>Consumer Protection Law</strong>, and other applicable Lebanese rules, you may have
            the following rights in relation to your personal data (some overlap with how we operate in practice):
          </p>
          <ul className="list-disc space-y-1.5 ps-5">
            <li>
              <strong>Access:</strong> request a copy of or information about the personal data we hold about you, including order-related data and
              account data processed by us (Clerk holds authentication data under its own policy).
            </li>
            <li>
              <strong>Rectification (correction):</strong> request correction of inaccurate or incomplete data we control (for example contact details
              on a recent order, where still editable under our processes).
            </li>
            <li>
              <strong>Erasure / anonymization:</strong> request deletion or anonymization where the law allows. Signed-in users can trigger a large part
              of this through <strong>Delete My Account &amp; Personal Data</strong> in account settings (see §9). Guests should email the privacy contact
              in §1 with enough detail to locate the order (e.g. order number and checkout email). We may retain anonymized transaction records where
              permitted.
            </li>
            <li>
              <strong>Withdraw consent:</strong> where processing is based on your consent (see §2), you may withdraw it; withdrawing may mean you cannot
              use certain features (for example checkout or an account) if processing is necessary to provide them.
            </li>
            <li>
              <strong>Object or restrict:</strong> where applicable law gives you the right to object to certain processing or to request restriction, you
              may contact us at the privacy address in §1 and we will respond in line with the law.
            </li>
            <li>
              <strong>Complaints:</strong> you may lodge a complaint with a <strong>competent supervisory authority or court in Lebanon</strong> if you
              believe your rights have been infringed, without prejudice to any other remedy.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">8. Security</h2>
          <p>
            We have implemented <strong>appropriate technical and organizational measures</strong> intended to protect personal data against{" "}
            <strong>unauthorized access</strong>, accidental loss, and misuse. No method of transmission or storage is completely secure; we work to
            keep safeguards consistent with the nature of the data and the risks involved.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">9. Retention and account deletion</h2>
          <p>
            We keep data only as long as needed for the purposes above and to meet legal or accounting requirements. When you use{" "}
            <strong>Delete My Account &amp; Personal Data</strong> in your <strong>account / privacy settings</strong>, we <strong>delete your wishlist</strong>,{" "}
            <strong>remove your link to past orders</strong>, and <strong>anonymize personal fields</strong> on orders that were tied to your account
            (for example name, phone, address lines, and guest email replaced with non-identifying placeholders) while <strong>retaining the underlying
            transaction record</strong> (amounts, items, order reference) where we need it for business, tax, or legal reasons. We also redact your
            identifiers in audit logs where applicable and delete your user record with Clerk. Clerk may retain certain data for a period under its
            own retention and backup practices.
          </p>
          <p>
            Guests without an account should contact us (see above) to discuss access, correction, or anonymization of checkout data, subject to what the
            law allows us to retain.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">10. Subprocessors</h2>
          <p>
            We rely on service providers including Clerk (authentication), Resend (transactional email), Vercel (hosting), Upstash (rate limiting when
            configured), and our database and object storage vendors. We share only what is needed for their services.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-foreground">11. Changes</h2>
          <p>
            We may update this policy from time to time. The &quot;Last updated&quot; date at the top will change when we do. Material changes may be
            highlighted on the site where appropriate.
          </p>
        </section>

        <p className="mt-12 border-t border-border pt-8 text-xs text-foreground/60">
          This document is provided for transparency and does not constitute legal advice. Have a qualified adviser review it for your specific
          situation under Lebanese and any other applicable law.
        </p>
      </article>
    </div>
  );
}
