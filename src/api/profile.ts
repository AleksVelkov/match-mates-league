import { createServerFn } from "@tanstack/react-start";
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

/** Returns a pre-signed PUT URL for uploading an avatar directly to DO Spaces. */
export const getAvatarUploadUrl = createServerFn({ method: "POST" })
  .validator(z.object({ filename: z.string(), contentType: z.string() }))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const env = getEnvStore();

    if (!env.DO_SPACES_KEY || !env.DO_SPACES_SECRET || !env.DO_SPACES_BUCKET || !env.DO_SPACES_ENDPOINT) {
      throw new Error("Avatar uploads are not configured. Contact the administrator.");
    }

    const ext = data.filename.split(".").pop() ?? "jpg";
    const key = `avatars/${me.id}/${Date.now()}.${ext}`;
    const endpoint = env.DO_SPACES_ENDPOINT.replace(/\/$/, "");
    const uploadUrl = `${endpoint}/${env.DO_SPACES_BUCKET}/${key}`;
    const publicUrl = uploadUrl;

    const aws = new AwsClient({
      accessKeyId: env.DO_SPACES_KEY,
      secretAccessKey: env.DO_SPACES_SECRET,
      region: env.DO_SPACES_REGION || "us-east-1",
      service: "s3",
    });

    const signedReq = await aws.sign(
      new Request(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": data.contentType,
        },
      }),
      { aws: { signQuery: true } },
    );

    return { uploadUrl: signedReq.url, publicUrl };
  });

/** After the client has uploaded the file, save the public URL to user.image. */
export const saveAvatarUrl = createServerFn({ method: "POST" })
  .validator(z.object({ url: z.string().url() }))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const db = getDb();
    await db.update(user).set({ image: data.url, updatedAt: new Date() }).where(eq(user.id, me.id));
    return { ok: true };
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
