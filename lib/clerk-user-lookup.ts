import { clerkClient } from "@clerk/nextjs/server";

export async function clerkUserExistsForEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const client = await clerkClient();
  const list = await client.users.getUserList({ emailAddress: [normalized] });
  return list.data.length > 0;
}

function isClerkUserId(id: string): boolean {
  return id.startsWith("user_");
}

/** Best-effort label for Security logs / admin tables (name → username → email). */
export function formatClerkUserForDisplay(user: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
  emailAddresses?: { emailAddress: string }[] | null;
}): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.username?.trim()) {
    const u = user.username.trim();
    return u.startsWith("@") ? u : `@${u}`;
  }
  if (user.primaryEmailAddress?.emailAddress) return user.primaryEmailAddress.emailAddress;
  const emails = user.emailAddresses ?? [];
  const first = emails[0];
  if (first?.emailAddress) return first.emailAddress;
  return "Clerk user";
}

/**
 * Resolves Clerk user IDs to display labels for the current page of audit rows.
 * Unknown or deleted users fall back to the raw id; non-Clerk ids are returned unchanged.
 */
export async function resolveClerkUserLabelsForIds(
  userIds: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter((id): id is string => !!id && isClerkUserId(id)))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const client = await clerkClient();
  await Promise.all(
    unique.map(async (id) => {
      try {
        const user = await client.users.getUser(id);
        map.set(id, formatClerkUserForDisplay(user));
      } catch {
        map.set(id, id);
      }
    }),
  );
  return map;
}
