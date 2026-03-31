import { defineRouting } from "next-intl/routing";
import { MOSAIK_LOCALES } from "@/lib/i18n-locales";

export const routing = defineRouting({
  locales: [...MOSAIK_LOCALES],
  defaultLocale: "en",
});
