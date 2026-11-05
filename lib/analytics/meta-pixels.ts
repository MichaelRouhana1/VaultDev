import { isListingStore, type ListingStore } from "../store-scope";

/** Classic ads use the `formal` shop. */
export type MetaShop = ListingStore;

const META_SHOPS: readonly MetaShop[] = ["women", "streetwear", "formal"];

function pixelId(value: string | undefined): string | null {
  const id = value?.trim();
  if (!id || !/^\d+$/.test(id)) return null;
  return id;
}

/** Direct `process.env.NEXT_PUBLIC_*` reads so Next can inline each id. */
export function metaPixelIdForShop(shop: MetaShop): string | null {
  switch (shop) {
    case "women":
      return pixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID_WOMEN);
    case "streetwear":
      return pixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID_STREETWEAR);
    case "formal":
      return pixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID_FORMAL);
  }
}

export function configuredMetaPixelIds(): string[] {
  const ids = META_SHOPS.map((shop) => metaPixelIdForShop(shop)).filter(
    (id): id is string => id != null,
  );
  return [...new Set(ids)];
}

export function hasAnyMetaPixel(): boolean {
  return configuredMetaPixelIds().length > 0;
}

export function metaShopsInOrder(shops: Iterable<MetaShop>): MetaShop[] {
  const present = new Set(shops);
  return META_SHOPS.filter((shop) => present.has(shop));
}

export function isMetaShop(value: string | null | undefined): value is MetaShop {
  return isListingStore(value);
}
