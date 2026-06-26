import { eq, and } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

const ACHIEVEMENT_KEYS = {
  FIRST_EXACT: "first_exact_score",
  TEN_EXACT: "10_exact_scores",
  TWENTY_FIVE_EXACT: "25_exact_scores",
  PERFECT_ROUND: "perfect_round",
  GIANT_KILLER: "giant_killer",
  UNSTOPPABLE: "unstoppable",
  PREDICTION_LEGEND: "prediction_legend",
  JOKER_MASTER: "joker_master",
} as const;

type Outcome = "exact" | "correct" | "wrong";

function getOutcome(
  predHome: number | null,
  predAway: number | null,
  resultHome: number,
  resultAway: number
): Outcome {
  if (predHome === null || predAway === null) return "wrong";
  if (predHome === resultHome && predAway === resultAway) return "exact";
  const predOutcome = Math.sign(predHome - predAway);
  const realOutcome = Math.sign(resultHome - resultAway);
  if (predOutcome === realOutcome) return "correct";
  return "wrong";
}

function calcPoints(outcome: Outcome, isJoker: boolean): number {
  const base = outcome === "exact" ? 5 : outcome === "correct" ? 2 : 0;
  return isJoker ? base * 2 : base;
}

export async function scoreFixture(
  db: DrizzleD1Database<typeof schema>,
  fixtureId: string,
  resultHome: number,
  resultAway: number
) {
  // Update fixture result
  await db
    .update(schema.fixtures)
    .set({ resultHome, resultAway, status: "finished" })
    .where(eq(schema.fixtures.id, fixtureId));

  // Get all predictions for this fixture
  const preds = await db
    .select()
    .from(schema.predictions)
    .where(eq(schema.predictions.fixtureId, fixtureId));

  // Score each prediction
  const now = new Date();
  for (const pred of preds) {
    const outcome = getOutcome(pred.scoreHome, pred.scoreAway, resultHome, resultAway);
    const points = calcPoints(outcome, pred.isJoker);
    await db
      .update(schema.predictions)
      .set({ pointsEarned: points })
      .where(
        and(
          eq(schema.predictions.fixtureId, fixtureId),
          eq(schema.predictions.userId, pred.userId)
        )
      );

    await checkAndUnlockAchievements(db, pred.userId, now);
  }
}

async function checkAndUnlockAchievements(
  db: DrizzleD1Database<typeof schema>,
  userId: string,
  now: Date
) {
  // Get all scored predictions for user
  const userPreds = await db
    .select({ p: schema.predictions, f: schema.fixtures })
    .from(schema.predictions)
    .innerJoin(schema.fixtures, eq(schema.predictions.fixtureId, schema.fixtures.id))
    .where(
      and(eq(schema.predictions.userId, userId))
    );

  const existing = await db
    .select({ key: schema.achievements.achievementKey })
    .from(schema.achievements)
    .where(eq(schema.achievements.userId, userId));

  const unlocked = new Set(existing.map((a) => a.key));

  const exactCount = userPreds.filter(
    ({ p, f }) =>
      f.resultHome !== null &&
      p.scoreHome === f.resultHome &&
      p.scoreAway === f.resultAway
  ).length;

  const totalPoints = userPreds.reduce((sum, { p }) => sum + (p.pointsEarned ?? 0), 0);

  const successfulJokers = userPreds.filter(
    ({ p }) => p.isJoker && (p.pointsEarned ?? 0) > 0
  ).length;

  async function unlock(key: string) {
    if (unlocked.has(key)) return;
    await db.insert(schema.achievements).values({
      id: crypto.randomUUID(),
      userId,
      achievementKey: key,
      unlockedAt: now,
    }).onConflictDoNothing();
  }

  if (exactCount >= 1) await unlock(ACHIEVEMENT_KEYS.FIRST_EXACT);
  if (exactCount >= 10) await unlock(ACHIEVEMENT_KEYS.TEN_EXACT);
  if (exactCount >= 25) await unlock(ACHIEVEMENT_KEYS.TWENTY_FIVE_EXACT);
  if (totalPoints >= 1000) await unlock(ACHIEVEMENT_KEYS.PREDICTION_LEGEND);
  if (successfulJokers >= 5) await unlock(ACHIEVEMENT_KEYS.JOKER_MASTER);

  // Giant Killer: exact score on an away win that the home team was expected to win
  // (away short-odds win — simplified: any exact away win prediction)
  const giantKiller = userPreds.some(
    ({ p, f }) =>
      f.resultHome !== null &&
      p.scoreHome === f.resultHome &&
      p.scoreAway === f.resultAway &&
      (f.resultAway ?? 0) > (f.resultHome ?? 0) // away win
  );
  if (giantKiller) await unlock(ACHIEVEMENT_KEYS.GIANT_KILLER);

  // Unstoppable: 10 correct outcomes in a row (sorted by kickoff)
  const sorted = userPreds
    .filter(({ p }) => p.pointsEarned !== null)
    .sort((a, b) => a.f.kickoffAt.getTime() - b.f.kickoffAt.getTime());

  let streak = 0;
  let maxStreak = 0;
  for (const { p, f } of sorted) {
    if (f.resultHome === null) { streak = 0; continue; }
    const outcome = getOutcome(p.scoreHome, p.scoreAway, f.resultHome!, f.resultAway!);
    if (outcome !== "wrong") {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  }
  if (maxStreak >= 10) await unlock(ACHIEVEMENT_KEYS.UNSTOPPABLE);
}
