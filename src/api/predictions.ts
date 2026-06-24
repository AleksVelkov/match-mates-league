import { createServerFn } from "@tanstack/react-start";
import { eq, and, ne, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { fixtures, predictions, groupMembers, groups } from "@/db/schema";
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
