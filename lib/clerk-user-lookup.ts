import { clerkClient } from "@clerk/nextjs/server";

export async function clerkUserExistsForEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const client = await clerkClient();
  const list = await client.users.getUserList({ emailAddress: [normalized] });
  return list.data.length > 0;
}
