import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { predictions, fixtures, groups } from "@/db/schema";
import { requireUser } from "@/lib/session";

export type AchievementDetail = {
  date: string; // ISO — the triggering match's kickoff
  groupName: string;
  groupEmoji: string;
  homeShort: string;
  awayShort: string;
  homeCrest: string | null;
  awayCrest: string | null;
  predHome: number | null;
  predAway: number | null;
  resultHome: number;
  resultAway: number;
  isJoker: boolean;
  pointsEarned: number;
  progress: string; // e.g. "10th exact score" or "Crossed 100 points"
};

export type AchievementView = {
  key: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  detail: AchievementDetail | null;
};

type ScoredRow = {
  scoreHome: number | null;
  scoreAway: number | null;
  isJoker: boolean;
  pointsEarned: number;
  kickoffAt: Date;
  homeShort: string;
  awayShort: string;
  homeCrest: string | null;
  awayCrest: string | null;
  resultHome: number;
  resultAway: number;
  groupId: string;
  groupName: string;
  groupEmoji: string;
};

function outcomeOf(r: ScoredRow): "exact" | "correct" | "wrong" {
  if (r.scoreHome === null || r.scoreAway === null) return "wrong";
  if (r.scoreHome === r.resultHome && r.scoreAway === r.resultAway) return "exact";
  return Math.sign(r.scoreHome - r.scoreAway) === Math.sign(r.resultHome - r.resultAway)
    ? "correct"
    : "wrong";
}

function detailFrom(r: ScoredRow, progress: string): AchievementDetail {
  return {
    date: r.kickoffAt instanceof Date ? r.kickoffAt.toISOString() : new Date(r.kickoffAt).toISOString(),
    groupName: r.groupName,
    groupEmoji: r.groupEmoji,
    homeShort: r.homeShort,
    awayShort: r.awayShort,
    homeCrest: r.homeCrest,
    awayCrest: r.awayCrest,
    predHome: r.scoreHome,
    predAway: r.scoreAway,
    resultHome: r.resultHome,
    resultAway: r.resultAway,
    isJoker: r.isJoker,
    pointsEarned: r.pointsEarned,
    progress,
  };
}

/**
 * Compute the user's achievements directly from their scored predictions, so each
 * unlocked achievement can name the exact match, score, group, and date that earned
 * it. Treats every (group, fixture) prediction as a distinct scored event — matching
 * how totals are summed across groups elsewhere.
 */
export const getMyAchievements = createServerFn({ method: "GET" }).handler(async (): Promise<AchievementView[]> => {
  const me = await requireUser();
  const db = getDb();

  const raw = await db
    .select({
      scoreHome: predictions.scoreHome,
      scoreAway: predictions.scoreAway,
      isJoker: predictions.isJoker,
      pointsEarned: predictions.pointsEarned,
      kickoffAt: fixtures.kickoffAt,
      homeShort: fixtures.homeShort,
      awayShort: fixtures.awayShort,
      homeCrest: fixtures.homeCrest,
      awayCrest: fixtures.awayCrest,
      resultHome: fixtures.resultHome,
      resultAway: fixtures.resultAway,
      groupId: groups.id,
      groupName: groups.name,
      groupEmoji: groups.emoji,
    })
    .from(predictions)
    .innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
    .innerJoin(groups, eq(predictions.groupId, groups.id))
    .where(
      and(
        eq(predictions.userId, me.id),
        isNotNull(predictions.pointsEarned),
        isNotNull(fixtures.resultHome),
        isNotNull(fixtures.resultAway),
      ),
    );

  // Normalize + order chronologically (by match), deterministic tie-break by group.
  const rows: ScoredRow[] = raw
    .map((r) => ({
      scoreHome: r.scoreHome,
      scoreAway: r.scoreAway,
      isJoker: r.isJoker,
      pointsEarned: r.pointsEarned ?? 0,
      kickoffAt: r.kickoffAt as Date,
      homeShort: r.homeShort,
      awayShort: r.awayShort,
      homeCrest: r.homeCrest ?? null,
      awayCrest: r.awayCrest ?? null,
      resultHome: r.resultHome as number,
      resultAway: r.resultAway as number,
      groupId: r.groupId,
      groupName: r.groupName,
      groupEmoji: r.groupEmoji,
    }))
    .sort((a, b) => {
      const t = new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
      if (t !== 0) return t;
      return a.groupId < b.groupId ? -1 : a.groupId > b.groupId ? 1 : 0;
    });

  // ── Find triggering rows for each achievement ──
  const exactRows = rows.filter((r) => outcomeOf(r) === "exact");

  // Points thresholds: row where the running total first crosses.
  let running = 0;
  let centuryRow: ScoredRow | null = null;
  let legendRow: ScoredRow | null = null;
  for (const r of rows) {
    running += r.pointsEarned;
    if (!centuryRow && running >= 100) centuryRow = r;
    if (!legendRow && running >= 1000) legendRow = r;
  }

  // Streak: the match completing a run of 10 consecutive non-wrong results.
  let streak = 0;
  let streakRow: ScoredRow | null = null;
  for (const r of rows) {
    streak = outcomeOf(r) === "wrong" ? 0 : streak + 1;
    if (!streakRow && streak >= 10) streakRow = r;
  }

  const nth = (i: number) => (exactRows.length > i ? exactRows[i] : null);

  return [
    {
      key: "first_exact",
      name: "First Exact",
      description: "Nail one on the head.",
      icon: "🎯",
      unlocked: exactRows.length >= 1,
      detail: nth(0) ? detailFrom(nth(0)!, "Your 1st exact score") : null,
    },
    {
      key: "ten_exact",
      name: "10 Exact",
      description: "You see the future.",
      icon: "🔮",
      unlocked: exactRows.length >= 10,
      detail: nth(9) ? detailFrom(nth(9)!, "Your 10th exact score") : null,
    },
    {
      key: "twentyfive_exact",
      name: "25 Exact",
      description: "Certified clairvoyant.",
      icon: "🧿",
      unlocked: exactRows.length >= 25,
      detail: nth(24) ? detailFrom(nth(24)!, "Your 25th exact score") : null,
    },
    {
      key: "unstoppable",
      name: "Unstoppable",
      description: "10 correct in a row.",
      icon: "⚡",
      unlocked: streakRow !== null,
      detail: streakRow ? detailFrom(streakRow, "Completed a 10-match streak") : null,
    },
    {
      key: "legend",
      name: "Legend",
      description: "Reach 1000 total points.",
      icon: "👑",
      unlocked: legendRow !== null,
      detail: legendRow ? detailFrom(legendRow, "Crossed 1000 points") : null,
    },
    {
      key: "century",
      name: "Century",
      description: "Reach 100 total points.",
      icon: "💯",
      unlocked: centuryRow !== null,
      detail: centuryRow ? detailFrom(centuryRow, "Crossed 100 points") : null,
    },
  ];
});
