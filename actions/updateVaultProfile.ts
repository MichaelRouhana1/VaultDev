"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  parseVaultProfile,
  vaultProfileSchema,
  type VaultProfileStored,
} from "@/lib/account-vault-profile";
import { logger } from "@/lib/logger";

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

function splitCustomerName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function parsePhoneForVault(
  phoneNumber: string,
  fallbackCountryCode: string,
): { phoneCountryCode: string; phoneNumber: string } {
  const trimmed = phoneNumber.trim();
  const m = trimmed.match(/^(\+\d{1,4})\s*(.+)$/);
  if (m?.[1] && m[2]?.trim()) {
    return { phoneCountryCode: m[1], phoneNumber: m[2].trim() };
  }
  return { phoneCountryCode: fallbackCountryCode, phoneNumber: trimmed };
}

function parseAddressLine1(line: string): { street: string; stairway: string } {
  const idx = line.indexOf(",");
  if (idx === -1) return { street: line.trim(), stairway: "" };
  return {
    street: line.slice(0, idx).trim(),
    stairway: line.slice(idx + 1).trim(),
  };
}

function parseCityField(city: string): { district: string; locality: string } {
  const trimmed = city.trim();
  const sep = ", ";
  const idx = trimmed.indexOf(sep);
  if (idx === -1) return { district: "", locality: trimmed };
  return {
    district: trimmed.slice(0, idx).trim(),
    locality: trimmed.slice(idx + sep.length).trim(),
  };
}

/**
 * Persists checkout contact/address as the user's default VAULT profile.
 * Call only after verifying `userId` matches the active session (e.g. from placeOrder).
 */
export async function saveCheckoutAsDefaultAddress(
  userId: string,
  fields: {
    customerName: string;
    phoneNumber: string;
    addressLine1: string;
    city: string;
  },
): Promise<{ ok: true } | { ok: false }> {
  const { userId: sessionUserId } = await auth();
  if (!sessionUserId || sessionUserId !== userId) {
    return { ok: false };
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const prevMeta = (user.publicMetadata ?? {}) as Record<string, unknown>;
    const existingVault = parseVaultProfile(prevMeta.vaultProfile);

    const { firstName, lastName } = splitCustomerName(fields.customerName);
    const { phoneCountryCode, phoneNumber: localPhone } = parsePhoneForVault(
      fields.phoneNumber,
      existingVault.phoneCountryCode?.trim() || "+961",
    );
    const { street, stairway } = parseAddressLine1(fields.addressLine1);
    const { district, locality } = parseCityField(fields.city);

    const merged = {
      phoneCountryCode,
      phoneNumber: localPhone,
      shoppingPreference: existingVault.shoppingPreference ?? "",
      billing: {
        street,
        stairway,
        district,
        locality,
      },
    };

    const parsed = vaultProfileSchema.safeParse(merged);
    if (!parsed.success) {
      logger.warn("saveCheckoutAsDefaultAddress validation failed", { userId });
      return { ok: false };
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
  } catch (e) {
    logger.warn("saveCheckoutAsDefaultAddress failed", { userId, error: e });
    return { ok: false };
  }
}
