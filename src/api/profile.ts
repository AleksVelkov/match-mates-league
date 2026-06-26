import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { AwsClient } from "aws4fetch";
import { getDb } from "@/db/client";
import { user, userProfiles, seasons, predictions, fixtures, groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getEnvStore } from "@/lib/env-store";

export const getMyProfile = createServerFn({ method: "GET" }).handler(async () => {
  const me = await requireUser();
  const db = getDb();

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, me.id))
    .limit(1);

  const [userData] = await db
    .select({ id: user.id, name: user.name, email: user.email, image: user.image, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, me.id))
    .limit(1);

  return {
    id: me.id,
    name: userData?.name ?? me.name,
    email: me.email,
    image: userData?.image ?? null,
    country: profile?.country ?? null,
    countryCode: profile?.countryCode ?? null,
    memberSince: userData?.createdAt ?? null,
  };
});

export const updateMyName = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const db = getDb();
    await db.update(user).set({ name: data.name, updatedAt: new Date() }).where(eq(user.id, me.id));
    return { ok: true };
  });

export const updateMyCountry = createServerFn({ method: "POST" })
  .validator(z.object({ country: z.string(), countryCode: z.string().length(2) }))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const db = getDb();
    const now = new Date();
    await db
      .insert(userProfiles)
      .values({
        userId: me.id,
        country: data.country,
        countryCode: data.countryCode.toUpperCase(),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: { country: data.country, countryCode: data.countryCode.toUpperCase(), updatedAt: now },
      });
    return { ok: true };
  });

/**
 * Proxy avatar upload: client sends base64 image, server uploads to DO Spaces
 * and saves the URL — no browser-to-S3 connection, so no CORS needed.
 */
// Only these image types may be uploaded; the extension is derived from the
// validated type (never from the user-supplied filename).
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

/** Verify the decoded bytes actually match the claimed image type (magic bytes). */
function sniffImageType(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (contentType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/webp") {
    return (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // "RIFF"
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50  // "WEBP"
    );
  }
  return false;
}

export const uploadAvatar = createServerFn({ method: "POST" })
  .validator(
    z.object({
      filename: z.string().max(255),
      contentType: z.string(),
      base64: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const me = await requireUser();
    const env = getEnvStore();

    if (!env.DO_SPACES_KEY || !env.DO_SPACES_SECRET || !env.DO_SPACES_BUCKET || !env.DO_SPACES_ENDPOINT) {
      throw new Error("Avatar uploads are not configured. Contact the administrator.");
    }

    // 1. Validate the claimed content type against an allowlist.
    const ext = ALLOWED_IMAGE_TYPES[data.contentType];
    if (!ext) throw new Error("Unsupported image type. Please use PNG, JPEG, or WebP.");

    // 2. Decode base64 safely.
    let bytes: Uint8Array;
    try {
      const binary = atob(data.base64);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } catch {
      throw new Error("Invalid image data.");
    }

    // 3. Enforce a size cap.
    if (bytes.length === 0) throw new Error("Image is empty.");
    if (bytes.length > MAX_AVATAR_BYTES) throw new Error("Image is too large (max 5 MB).");

    // 4. Confirm the bytes really are the claimed image type.
    if (!sniffImageType(bytes, data.contentType)) {
      throw new Error("File does not appear to be a valid image.");
    }

    // 5. Build a key from the trusted user id + server-controlled extension only.
    const key = `avatars/${me.id}/${Date.now()}.${ext}`;
    const endpoint = env.DO_SPACES_ENDPOINT.replace(/\/$/, "");
    const publicUrl = `${endpoint}/${env.DO_SPACES_BUCKET}/${key}`;

    const aws = new AwsClient({
      accessKeyId: env.DO_SPACES_KEY,
      secretAccessKey: env.DO_SPACES_SECRET,
      region: env.DO_SPACES_REGION || "us-east-1",
      service: "s3",
    });

    // Sign a pre-signed URL (body hash = UNSIGNED-PAYLOAD, avoids streaming issues)
    const { url: signedUrl } = await aws.sign(
      new Request(publicUrl, {
        method: "PUT",
        headers: { "Content-Type": data.contentType, "x-amz-acl": "public-read" },
      }),
      { aws: { signQuery: true } },
    );

    // Server-to-server PUT — no CORS
    const res = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": data.contentType, "x-amz-acl": "public-read" },
      body: bytes,
    });
    if (!res.ok) {
      // Log detail server-side; surface a generic message.
      console.error("Avatar storage upload failed:", res.status, await res.text().catch(() => res.statusText));
      throw new Error("Upload failed. Please try again.");
    }

    const db = getDb();
    await db.update(user).set({ image: publicUrl, updatedAt: new Date() }).where(eq(user.id, me.id));
    return { url: publicUrl };
  });

// ─── Seasons ──────────────────────────────────────────────────────────────────

export const getSeasons = createServerFn({ method: "GET" }).handler(async () => {
  await requireUser();
  const db = getDb();
  return db.select().from(seasons).orderBy(seasons.startDate);
});

/** Stats for the current user within a season's date range. */
export const getMySeasonStats = createServerFn({ method: "GET" })
  .validator(z.object({ seasonId: z.string() }))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const db = getDb();

    const [season] = await db.select().from(seasons).where(eq(seasons.id, data.seasonId)).limit(1);
    if (!season) throw new Error("Season not found");

    // All my groups
    const myGroups = await db
      .select({ id: groups.id, name: groups.name, emoji: groups.emoji })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, me.id));

    if (!myGroups.length) return { seasonId: data.seasonId, points: 0, exact: 0, predicted: 0, correct: 0 };

    const groupIds = myGroups.map((g) => g.id);

    const [stats] = await db
      .select({
        points: sql<number>`COALESCE(SUM(${predictions.pointsEarned}), 0)`,
        exact: sql<number>`COALESCE(SUM(CASE WHEN ${predictions.scoreHome} = ${fixtures.resultHome} AND ${predictions.scoreAway} = ${fixtures.resultAway} AND ${fixtures.resultHome} IS NOT NULL THEN 1 ELSE 0 END), 0)`,
        predicted: sql<number>`COUNT(${predictions.id})`,
        correct: sql<number>`COALESCE(SUM(CASE WHEN SIGN(CAST(${predictions.scoreHome} AS REAL) - CAST(${predictions.scoreAway} AS REAL)) = SIGN(CAST(${fixtures.resultHome} AS REAL) - CAST(${fixtures.resultAway} AS REAL)) AND ${fixtures.resultHome} IS NOT NULL THEN 1 ELSE 0 END), 0)`,
      })
      .from(predictions)
      .innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
      .where(
        and(
          eq(predictions.userId, me.id),
          sql`${predictions.groupId} IN (${sql.join(groupIds.map((id) => sql`${id}`), sql`, `)})`,
          gte(fixtures.kickoffAt, season.startDate),
          lte(fixtures.kickoffAt, season.endDate),
        ),
      );

    return {
      seasonId: data.seasonId,

      points: Number(stats?.points ?? 0),
      exact: Number(stats?.exact ?? 0),
      predicted: Number(stats?.predicted ?? 0),
      correct: Number(stats?.correct ?? 0),
    };
  });

/**
 * Permanently deletes the authenticated user's account and all associated data.
 * Deletion order: predictions → groupMembers → userProfiles → user
 * (session + account rows cascade-delete from user via FK).
 */
export const deleteMyAccount = createServerFn({ method: "POST" }).handler(async () => {
  const me = await requireUser();
  const db = getDb();

  await db.delete(predictions).where(eq(predictions.userId, me.id));
  await db.delete(groupMembers).where(eq(groupMembers.userId, me.id));
  await db.delete(userProfiles).where(eq(userProfiles.userId, me.id));
  await db.delete(user).where(eq(user.id, me.id));

  // Clear the session cookie so the browser doesn't carry a dead token
  setCookie("scoriq_session", "", { maxAge: 0, path: "/" });

  return { ok: true };
});
