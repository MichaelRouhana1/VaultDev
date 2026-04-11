/** Public storefront social / chat links (footer + contact page). */
export const VAULT_WHATSAPP_DISPLAY = "+961 76 358 540";
/** Digits only for wa.me (Lebanon +961 76 358 540). */
export const VAULT_WHATSAPP_WA_ME = "96176358540";
export const VAULT_INSTAGRAM_URL = "https://www.instagram.com/vaultstreetcore/";

export function vaultWhatsAppHref(): string {
  return `https://wa.me/${VAULT_WHATSAPP_WA_ME}`;
}
