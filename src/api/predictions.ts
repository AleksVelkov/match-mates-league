import { createServerFn } from "@tanstack/react-start";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { fixtures, predictions, groupMembers } from "@/db/schema";
import { requireUser } from "@/lib/session";

const PredictionInput = z.object({
  fixtureId: z.string(),
  scoreHome: z.number().int().min(0).max(99).nullable(),
  scoreAway: z.number().int().min(0).max(99).nullable(),
  isJoker: z.boolean(),
});

export const getMyPredictions = createServerFn({ method: "GET" })
  .validator(z.object({ groupId: z.string(), round: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    const roundFixtures = await db
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.groupId, data.groupId), eq(fixtures.round, data.round)));

    const fixtureIds = roundFixtures.map((f) => f.id);
    if (!fixtureIds.length) return [];

    const myPreds = await db
      .select()
      .from(predictions)
      .where(and(eq(predictions.userId, user.id), inArray(predictions.fixtureId, fixtureIds)));

    return myPreds;
  });

export const savePredictions = createServerFn({ method: "POST" })
  .validator(
    z.object({
      groupId: z.string(),
      round: z.number(),
      predictions: z.array(PredictionInput),
    })
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    // Verify membership
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, data.groupId), eq(groupMembers.userId, user.id)))
      .limit(1);
    if (!member) throw new Error("Not a member of this group");

    // Validate exactly one joker
    const jokerCount = data.predictions.filter((p) => p.isJoker).length;
    if (jokerCount > 1) throw new Error("Only one joker allowed per round");

    // Get fixtures to check kickoff times
    const roundFixtures = await db
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.groupId, data.groupId), eq(fixtures.round, data.round)));

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
          fixtureId: pred.fixtureId,
          userId: user.id,
          scoreHome: pred.scoreHome,
          scoreAway: pred.scoreAway,
          isJoker: pred.isJoker,
          submittedAt: now,
        })
        .onConflictDoUpdate({
          target: [predictions.fixtureId, predictions.userId],
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

    const roundFixtures = await db
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.groupId, data.groupId), eq(fixtures.round, data.round)));

    const now = new Date();

    // Only reveal predictions for fixtures whose kickoff has passed
    const revealableFixtureIds = roundFixtures
      .filter((f) => f.kickoffAt <= now)
      .map((f) => f.id);

    if (!revealableFixtureIds.length) return [];

    return db
      .select()
      .from(predictions)
      .where(inArray(predictions.fixtureId, revealableFixtureIds));
  });
