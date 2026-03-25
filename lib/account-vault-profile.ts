import { z } from "zod";

export const vaultProfileSchema = z.object({
  phoneCountryCode: z.string().max(8).optional().default("+961"),
  phoneNumber: z.string().max(32).optional().default(""),
  shoppingPreference: z
    .union([z.enum(["women", "men"]), z.literal("")])
    .optional()
    .default(""),
  billing: z
    .object({
      street: z.string().max(256).optional().default(""),
      stairway: z.string().max(15).optional().default(""),
      district: z.string().max(128).optional().default(""),
      locality: z.string().max(128).optional().default(""),
    })
    .optional()
    .default(() => ({
      street: "",
      stairway: "",
      district: "",
      locality: "",
    })),
});

export type VaultProfileInput = z.infer<typeof vaultProfileSchema>;

export type VaultProfileStored = {
  phoneCountryCode?: string;
  phoneNumber?: string;
  shoppingPreference?: "women" | "men" | "";
  billing?: {
    street?: string;
    stairway?: string;
    district?: string;
    locality?: string;
  };
};

export function parseVaultProfile(raw: unknown): VaultProfileStored {
  const parsed = vaultProfileSchema.safeParse(raw);
  if (!parsed.success) return {};
  return parsed.data;
}
