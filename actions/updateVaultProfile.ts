"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  parseVaultProfile,
  vaultProfileSchema,
  type VaultProfileStored,
} from "@/lib/account-vault-profile";

export type UpdateVaultProfileResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateVaultProfile(form: unknown): Promise<UpdateVaultProfileResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "You must be signed in." };
  }

  const body = form as Record<string, unknown>;

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const prevMeta = (user.publicMetadata ?? {}) as Record<string, unknown>;
    const existingVault = parseVaultProfile(prevMeta.vaultProfile);

    const merged = {
      phoneCountryCode: body.phoneCountryCode,
      phoneNumber: body.phoneNumber,
      shoppingPreference:
        body.shoppingPreference !== undefined
          ? body.shoppingPreference
          : (existingVault.shoppingPreference ?? ""),
      billing: {
        street: body.billingStreet,
        stairway: body.billingStairway,
        district: body.billingDistrict,
        locality: body.billingLocality,
      },
    };

    const parsed = vaultProfileSchema.safeParse(merged);
    if (!parsed.success) {
      return { ok: false, error: "Please check your details and try again." };
    }
    const vaultProfile: VaultProfileStored = {
      phoneCountryCode: parsed.data.phoneCountryCode,
      phoneNumber: parsed.data.phoneNumber,
      shoppingPreference: parsed.data.shoppingPreference as VaultProfileStored["shoppingPreference"],
      billing: parsed.data.billing,
    };

    await client.users.updateUser(userId, {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      publicMetadata: {
        ...prevMeta,
        vaultProfile,
      },
    });

    revalidatePath("/account");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save. Please try again." };
  }
}
