import { getStoreCategories } from "@/lib/storefront-categories";
import { NavbarClient } from "@/components/NavbarClient";

/** Fetches every store’s nav categories on the server so mobile + desktop menus render without client round-trips. */
export async function Navbar() {
  const [streetwearCategories, formalCategories, womenCategories] = await Promise.all([
    getStoreCategories("streetwear"),
    getStoreCategories("formal"),
    getStoreCategories("women"),
  ]);

  return (
    <NavbarClient
      streetwearCategories={streetwearCategories}
      formalCategories={formalCategories}
      womenCategories={womenCategories}
    />
  );
}
