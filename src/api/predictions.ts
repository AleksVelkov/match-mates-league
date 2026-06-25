import { createServerFn } from "@tanstack/react-start";
import { eq, and, ne, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { fixtures, predictions, groupMembers, groups, user } from "@/db/schema";
import { requireUser } from "@/lib/session";

const PredictionInput = z.object({
  fixtureId: z.string(),
  scoreHome: z.number().int().min(0).max(99).nullable(),
  scoreAway: z.number().int().min(0).max(99).nullable(),
  isJoker: z.boolean(),
});

/** Resolve the group's league for a member, or throw if not a member. */
async function requireMembership(db: ReturnType<typeof getDb>, groupId: string, userId: string) {
  const [row] = await db
    .select({ competition: groups.competition })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Not a member of this group");
  return row.competition;
}

export const getMyPredictions = createServerFn({ method: "GET" })
  .validator(z.object({ groupId: z.string(), round: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    const competition = await requireMembership(db, data.groupId, user.id);

    const roundFixtures = await db
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.competition, competition), eq(fixtures.round, data.round)));

    const fixtureIds = roundFixtures.map((f) => f.id);
    if (!fixtureIds.length) return [];

    const myPreds = await db
      .select()
      .from(predictions)
      .where(
        and(
          eq(predictions.groupId, data.groupId),
          eq(predictions.userId, user.id),
          inArray(predictions.fixtureId, fixtureIds),
        ),
      );

    return myPreds;
  });

export const savePredictions = createServerFn({ method: "POST" })
  .validator(
    z.object({
      groupId: z.string(),
      round: z.number(),
      predictions: z.array(PredictionInput),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    const competition = await requireMembership(db, data.groupId, user.id);

    // Validate exactly one joker
    const jokerCount = data.predictions.filter((p) => p.isJoker).length;
    if (jokerCount > 1) throw new Error("Only one joker allowed per round");

    // Get fixtures to check kickoff times
    const roundFixtures = await db
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.competition, competition), eq(fixtures.round, data.round)));

    const fixtureMap = new Map(roundFixtures.map((f) => [f.id, f]));
    const now = new Date();

    for (const pred of data.predictions) {
      const fixture = fixtureMap.get(pred.fixtureId);
      if (!fixture) continue;

      // Lock predictions once kickoff passes
      if (fixture.kickoffAt <= now) continue;

      await db
        .insert(predictions)
        .values({
          id: crypto.randomUUID(),
          groupId: data.groupId,
          fixtureId: pred.fixtureId,
          userId: user.id,
          scoreHome: pred.scoreHome,
          scoreAway: pred.scoreAway,
          isJoker: pred.isJoker,
          submittedAt: now,
        })
        .onConflictDoUpdate({
          target: [predictions.groupId, predictions.fixtureId, predictions.userId],
          set: {
            scoreHome: pred.scoreHome,
            scoreAway: pred.scoreAway,
            isJoker: pred.isJoker,
            submittedAt: now,
          },
        });
    }

    return { ok: true };
  });

export const getGroupPredictions = createServerFn({ method: "GET" })
  .validator(z.object({ groupId: z.string(), round: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    const competition = await requireMembership(db, data.groupId, user.id);

    const roundFixtures = await db
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.competition, competition), eq(fixtures.round, data.round)));

    const now = new Date();

    // Only reveal predictions for fixtures whose kickoff has passed
    const revealableFixtureIds = roundFixtures.filter((f) => f.kickoffAt <= now).map((f) => f.id);

    if (!revealableFixtureIds.length) return [];

    return db
      .select()
      .from(predictions)
      .where(
        and(
          eq(predictions.groupId, data.groupId),
          inArray(predictions.fixtureId, revealableFixtureIds),
        ),
      );
  });

/**
 * Copy the user's round predictions from one group to every other group they
 * belong to in the same league. Only fixtures that haven't kicked off are
 * affected, and each target round is mirrored exactly (so the single-joker rule
 * is preserved).
 */
export const copyPredictionsToMyGroups = createServerFn({ method: "POST" })
  .validator(z.object({ groupId: z.string(), round: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    const competition = await requireMembership(db, data.groupId, user.id);

    // Round fixtures (central) that are still open for predictions.
    const roundFixtures = await db
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.competition, competition), eq(fixtures.round, data.round)));

    const now = new Date();
    const unlockedIds = roundFixtures.filter((f) => f.kickoffAt > now).map((f) => f.id);
    if (!unlockedIds.length) return { groups: 0, predictions: 0 };

    // The predictions we'll replicate.
    const sourcePreds = await db
      .select()
      .from(predictions)
      .where(
        and(
          eq(predictions.groupId, data.groupId),
          eq(predictions.userId, user.id),
          inArray(predictions.fixtureId, unlockedIds),
        ),
      );
    if (!sourcePreds.length) return { groups: 0, predictions: 0 };

    // Other groups in the same league this user is a member of.
    const targets = await db
      .select({ id: groups.id })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(
        and(
          eq(groupMembers.userId, user.id),
          eq(groups.competition, competition),
          ne(groups.id, data.groupId),
        ),
      );
    if (!targets.length) return { groups: 0, predictions: 0 };

    let copied = 0;
    for (const t of targets) {
      // Clear any existing jokers on the open fixtures first, so the mirrored
      // round can never end up with more than one joker.
      await db
        .update(predictions)
        .set({ isJoker: false })
        .where(
          and(
            eq(predictions.groupId, t.id),
            eq(predictions.userId, user.id),
            inArray(predictions.fixtureId, unlockedIds),
          ),
        );

      for (const p of sourcePreds) {
        await db
          .insert(predictions)
          .values({
            id: crypto.randomUUID(),
            groupId: t.id,
            fixtureId: p.fixtureId,
            userId: user.id,
            scoreHome: p.scoreHome,
            scoreAway: p.scoreAway,
            isJoker: p.isJoker,
            submittedAt: now,
          })
          .onConflictDoUpdate({
            target: [predictions.groupId, predictions.fixtureId, predictions.userId],
            set: {
              scoreHome: p.scoreHome,
              scoreAway: p.scoreAway,
              isJoker: p.isJoker,
              submittedAt: now,
            },
          });
        copied++;
      }
    }

    return { groups: targets.length, predictions: copied };
  });

/** All finished rounds for a group: fixtures + every member's prediction & points. */
export const getGroupHistory = createServerFn({ method: "GET" })
  .validator(z.object({ groupId: z.string() }))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const db = getDb();
    const competition = await requireMembership(db, data.groupId, me.id);

    const members = await db
      .select({ id: user.id, name: user.name, image: user.image })
      .from(groupMembers)
      .innerJoin(user, eq(groupMembers.userId, user.id))
      .where(eq(groupMembers.groupId, data.groupId))
      .orderBy(groupMembers.joinedAt);

    const doneFixtures = await db
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.competition, competition), isNotNull(fixtures.resultHome)))
      .orderBy(fixtures.round, fixtures.kickoffAt);

    if (!doneFixtures.length) return { members, rounds: [] as RoundHistory[] };

    const allPreds = await db
      .select()
      .from(predictions)
      .where(and(
        eq(predictions.groupId, data.groupId),
        inArray(predictions.fixtureId, doneFixtures.map((f) => f.id)),
      ));

    const predByFixture = new Map<string, Map<string, typeof allPreds[0]>>();
    for (const p of allPreds) {
      if (!predByFixture.has(p.fixtureId)) predByFixture.set(p.fixtureId, new Map());
      predByFixture.get(p.fixtureId)!.set(p.userId, p);
    }

    const byRound = new Map<number, typeof doneFixtures>();
    for (const f of doneFixtures) {
      if (!byRound.has(f.round)) byRound.set(f.round, []);
      byRound.get(f.round)!.push(f);
    }

    const rounds: RoundHistory[] = Array.from(byRound.entries())
      .sort(([a], [b]) => b - a)
      .map(([round, rFixtures]) => {
        const fixtureRows = rFixtures.map((f) => ({
          id: f.id,
          homeShort: f.homeShort,
          awayShort: f.awayShort,
          homeCrest: f.homeCrest ?? null,
          awayCrest: f.awayCrest ?? null,
          kickoffAt: f.kickoffAt instanceof Date ? f.kickoffAt.toISOString() : String(f.kickoffAt),
          resultHome: f.resultHome!,
          resultAway: f.resultAway!,
          memberPredictions: members.map((m) => {
            const p = predByFixture.get(f.id)?.get(m.id);
            return {
              userId: m.id,
              scoreHome: p?.scoreHome ?? null,
              scoreAway: p?.scoreAway ?? null,
              pointsEarned: p?.pointsEarned ?? 0,
              isJoker: p?.isJoker ?? false,
            };
          }),
        }));

        const memberTotals = members
          .map((m) => ({
            userId: m.id,
            name: m.name,
            image: m.image ?? null,
            avatar: m.name.split(" ").map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2),
            points: rFixtures.reduce((sum, f) => sum + (predByFixture.get(f.id)?.get(m.id)?.pointsEarned ?? 0), 0),
          }))
          .sort((a, b) => b.points - a.points);

        return { round, fixtures: fixtureRows, memberTotals };
      });

    return { members, rounds };
  });

type RoundHistory = {
  round: number;
  fixtures: {
    id: string; homeShort: string; awayShort: string;
    homeCrest: string | null; awayCrest: string | null;
    kickoffAt: string; resultHome: number; resultAway: number;
    memberPredictions: { userId: string; scoreHome: number | null; scoreAway: number | null; pointsEarned: number; isJoker: boolean }[];
  }[];
  memberTotals: { userId: string; name: string; image: string | null; avatar: string; points: number }[];
};
