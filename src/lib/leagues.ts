import { eq, max } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import { config, fixtures } from "@/db/schema";

type Db = DrizzleD1Database<typeof schema>;

export const ENABLED_COMPETITIONS_KEY = "enabled_competitions";

/** Competitions the super admin has made available to end users. */
export async function getEnabledCompetitions(db: Db): Promise<string[]> {
  const [row] = await db
    .select()
    .from(config)
    .where(eq(config.key, ENABLED_COMPETITIONS_KEY))
    .limit(1);
  return row ? (JSON.parse(row.value) as string[]) : [];
}

export async function setEnabledCompetitions(db: Db, competitions: string[]): Promise<void> {
  const value = JSON.stringify(competitions);
  await db
    .insert(config)
    .values({ key: ENABLED_COMPETITIONS_KEY, value })
    .onConflictDoUpdate({ target: config.key, set: { value } });
}

/** Config key holding the published/active round for a competition. */
export function currentRoundKey(competition: string): string {
  return `current_round:${competition}`;
}

/**
 * The round end users currently see for a competition. Set by the super admin on
 * sync; falls back to the highest synced round, then 1.
 */
export async function getCurrentRound(db: Db, competition: string): Promise<number> {
  const [row] = await db
    .select()
    .from(config)
    .where(eq(config.key, currentRoundKey(competition)))
    .limit(1);
  if (row) {
    const n = parseInt(row.value, 10);
    if (!Number.isNaN(n)) return n;
  }

  const [maxRow] = await db
    .select({ r: max(fixtures.round) })
    .from(fixtures)
    .where(eq(fixtures.competition, competition));
  return maxRow?.r ?? 1;
}

export async function setCurrentRound(db: Db, competition: string, round: number): Promise<void> {
  const key = currentRoundKey(competition);
  const value = String(round);
  await db
    .insert(config)
    .values({ key, value })
    .onConflictDoUpdate({ target: config.key, set: { value } });
}
