import { getStoreCategories } from "@/lib/storefront-categories";
import { NavbarClient } from "@/components/NavbarClient";

/** Fetches both stores’ nav categories on the server so mobile + desktop menus render without client round-trips. */
export async function Navbar() {
  const [streetwearCategories, formalCategories] = await Promise.all([
    getStoreCategories("streetwear"),
    getStoreCategories("formal"),
  ]);

  return (
    <NavbarClient streetwearCategories={streetwearCategories} formalCategories={formalCategories} />
  );
}
