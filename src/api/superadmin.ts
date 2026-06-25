import { createServerFn } from "@tanstack/react-start";
import { eq, and, count, sql, isNull, isNotNull } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import { getDb } from "@/db/client";
import { user, groups, fixtures, predictions, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getEnvStore } from "@/lib/env-store";
import { scoreFixture } from "@/lib/scoring";
import { fetchMatchday, fetchAllMatches, mapStatus, COMPETITION_CODES } from "@/lib/football-data";
import {
  getEnabledCompetitions as readEnabledCompetitions,
  setEnabledCompetitions as writeEnabledCompetitions,
  getCurrentRound,
  setCurrentRound,
} from "@/lib/leagues";

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
      fixtureCount: sql<number>`(SELECT COUNT(*) FROM fixtures WHERE fixtures.competition = ${groups.competition})`,
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
  return readEnabledCompetitions(db);
});

export const setEnabledCompetitions = createServerFn({ method: "POST" })
  .validator(z.object({ competitions: z.array(z.string()) }))
  .handler(async ({ data }) => {
    await requireSuperAdmin();
    const db = getDb();
    await writeEnabledCompetitions(db, data.competitions);
    return { ok: true };
  });

// ─── Central match management ───────────────────────────────────────────────

/** The active/published round per enabled competition (for the dashboard). */
export const getCurrentRounds = createServerFn({ method: "GET" }).handler(async () => {
  await requireSuperAdmin();
  const db = getDb();
  const enabled = await readEnabledCompetitions(db);
  const entries = await Promise.all(
    enabled.map(async (c) => [c, await getCurrentRound(db, c)] as const),
  );
  return Object.fromEntries(entries) as Record<string, number>;
});

/** List the central fixtures for a competition + round (super admin view). */
export const getCompetitionFixtures = createServerFn({ method: "GET" })
  .validator(z.object({ competition: z.string(), round: z.number().int().min(1) }))
  .handler(async ({ data }) => {
    await requireSuperAdmin();
    const db = getDb();
    return db
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.competition, data.competition), eq(fixtures.round, data.round)))
      .orderBy(fixtures.kickoffAt);
  });

/**
 * Sync a competition matchday from football-data.org into the central fixtures
 * table. Finished matches with a result are auto-scored. Publishes the synced
 * matchday as the competition's active round.
 */
export const syncCompetition = createServerFn({ method: "POST" })
  .validator(z.object({ competition: z.string(), matchday: z.number().int().min(1) }))
  .handler(async ({ data }) => {
    await requireSuperAdmin();
    const db = getDb();

    const code = COMPETITION_CODES[data.competition];
    if (!code) throw new Error(`No API code for competition "${data.competition}"`);

    const { matches, rateLimit } = await fetchMatchday(code, data.matchday);

    let upserted = 0;
    for (const m of matches) {
      const externalId = String(m.id);
      const status = mapStatus(m.status) as "upcoming" | "live" | "finished";
      const resultHome = m.score.fullTime.home ?? null;
      const resultAway = m.score.fullTime.away ?? null;

      const [existing] = await db
        .select({ id: fixtures.id })
        .from(fixtures)
        .where(and(eq(fixtures.competition, data.competition), eq(fixtures.externalId, externalId)))
        .limit(1);

      let fixtureId: string;
      if (existing) {
        fixtureId = existing.id;
        await db
          .update(fixtures)
          .set({
            status,
            resultHome,
            resultAway,
            kickoffAt: new Date(m.utcDate),
            round: m.matchday,
            homeCrest: m.homeTeam.crest ?? null,
            awayCrest: m.awayTeam.crest ?? null,
          })
          .where(eq(fixtures.id, fixtureId));
      } else {
        fixtureId = crypto.randomUUID();
        await db.insert(fixtures).values({
          id: fixtureId,
          competition: data.competition,
          round: m.matchday,
          home: m.homeTeam.name,
          homeShort: m.homeTeam.tla,
          away: m.awayTeam.name,
          awayShort: m.awayTeam.tla,
          homeCrest: m.homeTeam.crest ?? null,
          awayCrest: m.awayTeam.crest ?? null,
          kickoffAt: new Date(m.utcDate),
          status,
          resultHome,
          resultAway,
          externalId,
          createdAt: new Date(),
        });
        upserted++;
      }

      // Auto-score finished matches across every group predicting them.
      if (status === "finished" && resultHome !== null && resultAway !== null) {
        await scoreFixture(db, fixtureId, resultHome, resultAway);
      }
    }

    await setCurrentRound(db, data.competition, data.matchday);

    return {
      synced: matches.length,
      new: upserted,
      requestsRemainingThisMinute: rateLimit.requestsAvailableMinute,
      rateLimitResetsInSeconds: rateLimit.counterResetSeconds,
    };
  });

/**
 * Pull the full season of matches + scores for one competition and upsert them
 * into the central fixtures table. Finished matches with unscored predictions
 * are scored, and the competition's active round is set to the earliest round
 * that still has an unplayed match. Designed to be called once per competition
 * (the dashboard loops enabled leagues) so each invocation stays within
 * Cloudflare's per-request subrequest budget.
 */
export const syncCompetitionSeason = createServerFn({ method: "POST" })
  .validator(z.object({ competition: z.string() }))
  .handler(async ({ data }) => {
    await requireSuperAdmin();
    const db = getDb();

    const code = COMPETITION_CODES[data.competition];
    if (!code) throw new Error(`No API code for competition "${data.competition}"`);

    const { matches, rateLimit } = await fetchAllMatches(code);

    const now = new Date();
    const ops: BatchItem<"sqlite">[] = [];
    let activeRound = Infinity;
    let maxRound = 0;

    for (const m of matches) {
      const status = mapStatus(m.status) as "upcoming" | "live" | "finished";
      const resultHome = m.score.fullTime.home ?? null;
      const resultAway = m.score.fullTime.away ?? null;
      maxRound = Math.max(maxRound, m.matchday);
      if (status !== "finished") activeRound = Math.min(activeRound, m.matchday);

      ops.push(
        db
          .insert(fixtures)
          .values({
            id: crypto.randomUUID(),
            competition: data.competition,
            round: m.matchday,
            home: m.homeTeam.name,
            homeShort: m.homeTeam.tla,
            away: m.awayTeam.name,
            awayShort: m.awayTeam.tla,
            homeCrest: m.homeTeam.crest ?? null,
            awayCrest: m.awayTeam.crest ?? null,
            kickoffAt: new Date(m.utcDate),
            status,
            resultHome,
            resultAway,
            externalId: String(m.id),
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: [fixtures.competition, fixtures.externalId],
            set: {
              status,
              resultHome,
              resultAway,
              kickoffAt: new Date(m.utcDate),
              round: m.matchday,
              homeCrest: m.homeTeam.crest ?? null,
              awayCrest: m.awayTeam.crest ?? null,
            },
          }),
      );
    }

    // Apply the upserts in batches (one subrequest each) to stay within limits.
    for (let i = 0; i < ops.length; i += 100) {
      const chunk = ops.slice(i, i + 100);
      if (chunk.length) {
        await db.batch(chunk as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
      }
    }

    // Score finished matches that have predictions which haven't been scored yet.
    const toScore = await db
      .selectDistinct({
        id: fixtures.id,
        resultHome: fixtures.resultHome,
        resultAway: fixtures.resultAway,
      })
      .from(fixtures)
      .innerJoin(predictions, eq(predictions.fixtureId, fixtures.id))
      .where(
        and(
          eq(fixtures.competition, data.competition),
          eq(fixtures.status, "finished"),
          isNotNull(fixtures.resultHome),
          isNotNull(fixtures.resultAway),
          isNull(predictions.pointsEarned),
        ),
      );

    for (const f of toScore) {
      await scoreFixture(db, f.id, f.resultHome!, f.resultAway!);
    }

    const currentRound = Number.isFinite(activeRound) ? activeRound : maxRound || 1;
    await setCurrentRound(db, data.competition, currentRound);

    return {
      competition: data.competition,
      synced: matches.length,
      scored: toScore.length,
      currentRound,
      requestsRemainingThisMinute: rateLimit.requestsAvailableMinute,
      rateLimitResetsInSeconds: rateLimit.counterResetSeconds,
    };
  });

/** Manually set/correct a match result (super admin override). Re-scores predictions. */
export const setMatchResult = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fixtureId: z.string(),
      resultHome: z.number().int().min(0),
      resultAway: z.number().int().min(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireSuperAdmin();
    const db = getDb();

    const [fixture] = await db
      .select({ id: fixtures.id })
      .from(fixtures)
      .where(eq(fixtures.id, data.fixtureId))
      .limit(1);
    if (!fixture) throw new Error("Match not found");

    await scoreFixture(db, data.fixtureId, data.resultHome, data.resultAway);
    return { ok: true };
  });

/** Override which round end users currently see for a competition. */
export const setActiveRound = createServerFn({ method: "POST" })
  .validator(z.object({ competition: z.string(), round: z.number().int().min(1) }))
  .handler(async ({ data }) => {
    await requireSuperAdmin();
    const db = getDb();
    await setCurrentRound(db, data.competition, data.round);
    return { ok: true };
  });

// ─── Seasons ──────────────────────────────────────────────────────────────────

export const getSeasonsList = createServerFn({ method: "GET" }).handler(async () => {
  await requireSuperAdmin();
  const db = getDb();
  return db.select().from(seasons).orderBy(seasons.startDate);
});

export const createSeason = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1).max(80),
      startDate: z.string(), // ISO date string
      endDate: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    await requireSuperAdmin();
    const db = getDb();
    const now = new Date();
    const id = crypto.randomUUID();
    await db.insert(seasons).values({
      id,
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      createdAt: now,
    });
    return { id };
  });

export const deleteSeason = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireSuperAdmin();
    const db = getDb();
    await db.delete(seasons).where(eq(seasons.id, data.id));
    return { ok: true };
  });
