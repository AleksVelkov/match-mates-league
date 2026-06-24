import { createServerFn } from "@tanstack/react-start";
import { eq, count, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { user, groups, groupMembers, fixtures, predictions, config } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getEnvStore } from "@/lib/env-store";

async function requireSuperAdmin() {
  const env = getEnvStore();
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  if (session.user.email !== env.SUPER_ADMIN_EMAIL) throw new Error("Not authorized");
  return session.user;
}

export const getSuperAdminStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireSuperAdmin();
  const db = getDb();

  const [[userCount], [groupCount], [fixtureCount], [predictionCount]] = await Promise.all([
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(groups),
    db.select({ n: count() }).from(fixtures),
    db.select({ n: count() }).from(predictions),
  ]);

  return {
    users: userCount?.n ?? 0,
    groups: groupCount?.n ?? 0,
    fixtures: fixtureCount?.n ?? 0,
    predictions: predictionCount?.n ?? 0,
  };
});

export const getAllGroups = createServerFn({ method: "GET" }).handler(async () => {
  await requireSuperAdmin();
  const db = getDb();

  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      emoji: groups.emoji,
      competition: groups.competition,
      round: groups.round,
      inviteCode: groups.inviteCode,
      createdAt: groups.createdAt,
      ownerName: user.name,
      ownerEmail: user.email,
      memberCount: sql<number>`(SELECT COUNT(*) FROM group_members WHERE group_members.group_id = ${groups.id})`,
      fixtureCount: sql<number>`(SELECT COUNT(*) FROM fixtures WHERE fixtures.group_id = ${groups.id})`,
    })
    .from(groups)
    .innerJoin(user, eq(groups.ownerId, user.id))
    .orderBy(sql`${groups.createdAt} DESC`);

  return rows;
});

export const getAllUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireSuperAdmin();
  const db = getDb();

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      groupCount: sql<number>`(SELECT COUNT(*) FROM group_members WHERE group_members.user_id = ${user.id})`,
      predictionCount: sql<number>`(SELECT COUNT(*) FROM predictions WHERE predictions.user_id = ${user.id})`,
    })
    .from(user)
    .orderBy(sql`${user.createdAt} DESC`);

  return rows;
});

export const getEnabledCompetitions = createServerFn({ method: "GET" }).handler(async () => {
  await requireSuperAdmin();
  const db = getDb();
  const [row] = await db.select().from(config).where(eq(config.key, "enabled_competitions")).limit(1);
  return row ? (JSON.parse(row.value) as string[]) : [];
});

export const setEnabledCompetitions = createServerFn({ method: "POST" })
  .validator(z.object({ competitions: z.array(z.string()) }))
  .handler(async ({ data }) => {
    await requireSuperAdmin();
    const db = getDb();
    await db
      .insert(config)
      .values({ key: "enabled_competitions", value: JSON.stringify(data.competitions) })
      .onConflictDoUpdate({ target: config.key, set: { value: JSON.stringify(data.competitions) } });
    return { ok: true };
  });
