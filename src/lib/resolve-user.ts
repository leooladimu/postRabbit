import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Resolves a database user by Clerk ID, with email fallback.
 *
 * If the user isn't found by clerkId (e.g. after switching from test→live Clerk),
 * we look up their email via the Clerk API and try to find them by email instead.
 * If found by email, we update the stale clerkId so future lookups are instant.
 *
 * If createIfMissing is true and no user exists at all, a new one is created.
 */
export async function resolveUser(
  clerkId: string,
  options?: { createIfMissing?: boolean }
) {
  // 1. Fast path: lookup by clerkId
  let user = await db.user.findUnique({ where: { clerkId } });
  if (user) return user;

  // 2. Fallback: get email from Clerk, try to find by email
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (email) {
    user = await db.user.findUnique({ where: { email } });
    if (user) {
      // Update stale clerkId so future lookups are instant
      user = await db.user.update({
        where: { id: user.id },
        data: { clerkId },
      });
      return user;
    }
  }

  // 3. Optionally create a new user
  if (options?.createIfMissing) {
    user = await db.user.create({
      data: {
        clerkId,
        email: email || "",
      },
    });
    return user;
  }

  return null;
}
