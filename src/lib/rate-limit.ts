import { getRequestHeader } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { rateLimits } from "@/db/schema";

/** Best-effort client IP from Cloudflare's edge headers. */
export function getClientIp(): string {
  return (
    getRequestHeader("cf-connecting-ip") ??
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Fixed-window rate limiter backed by D1. Throws a user-facing error once the
 * limit is exceeded within the window. Not perfectly atomic (no SELECT … FOR
 * UPDATE in D1), but more than adequate to blunt brute-force / abuse at this scale.
 */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const db = getDb();
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;

  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);

  // Fresh window (no row or expired) → reset to a single hit.
  if (!row || now > row.resetAt) {
    await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt })
      .onConflictDoUpdate({ target: rateLimits.key, set: { count: 1, resetAt } });
    return;
  }

  if (row.count >= limit) {
    const retryIn = Math.max(1, Math.ceil((row.resetAt - now) / 1000));
    throw new Error(`Too many attempts. Please try again in ${retryIn}s.`);
  }

  await db
    .update(rateLimits)
    .set({ count: row.count + 1 })
    .where(eq(rateLimits.key, key));
}
