# Commented-out UI

This file tracks storefront sections that are **disabled in code** but kept in the repo for easy restoration.

## Newsletter block (store home)

**What:** The newsletter signup block (heading, email field, Terms/Privacy consent checkbox, Subscribe button).

**Component:** `components/NewsletterForm.tsx`  
**Translations:** `NewsletterForm` in `messages/en.json`, `messages/fr.json`, `messages/ar.json`

**Where it was rendered:** `app/[locale]/[storeType]/page.tsx` — bottom of the streetwear / formal store home, after `ProductDiscovery`.

### How to turn it back on

1. In `app/[locale]/[storeType]/page.tsx`:
   - Uncomment the `import { NewsletterForm } from "@/components/NewsletterForm";` line.
   - Remove the JSX comment wrapper and render `<NewsletterForm />` again.
2. Optionally wire `NewsletterForm` to a real API or email provider (today submit is still a no-op).
3. Update or remove this section in `docs/commented-out.md` once re-enabled.

### Related links elsewhere

- **About** page footer includes a link labeled “Newsletter & new drops” pointing at `/streetwear` — that path was meant to scroll users to this section. While the block is off, you may want to adjust that copy or target in `messages/*/AboutPage` and `app/[locale]/about/page.tsx`.
