import { createServerFn } from "@tanstack/react-start";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { fixtures, groupMembers, groups, teams } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getCurrentRound } from "@/lib/leagues";

/** Build a TLA → teamId map from the teams table so team links work even before fixtures are re-synced. */
async function buildTeamIdMap(db: ReturnType<typeof getDb>): Promise<Map<string, string>> {
  const rows = await db.select({ id: teams.id, tla: teams.tla }).from(teams);
  return new Map(rows.map((r) => [r.tla, r.id]));
}

/** Fixtures for the current active round of a competition — no group context needed. */
export const getLeagueFixtures = createServerFn({ method: "GET" })
  .validator(z.object({ competition: z.string() }))
  .handler(async ({ data }) => {
    await requireUser();
    const db = getDb();
    const [round, teamIdMap] = await Promise.all([
      getCurrentRound(db, data.competition),
      buildTeamIdMap(db),
    ]);
    const rows = await db
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.competition, data.competition), eq(fixtures.round, round)))
      .orderBy(fixtures.kickoffAt);
    return rows.map((f) => ({
      ...f,
      homeTeamId: f.homeTeamId ?? teamIdMap.get(f.homeShort) ?? null,
      awayTeamId: f.awayTeamId ?? teamIdMap.get(f.awayShort) ?? null,
    }));
  });

export const getFixtures = createServerFn({ method: "GET" })
  .validator(z.object({ groupId: z.string(), round: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    // Verify membership and resolve the group's league.
    const [row] = await db
      .select({ competition: groups.competition })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(and(eq(groupMembers.groupId, data.groupId), eq(groupMembers.userId, user.id)))
      .limit(1);
    if (!row) throw new Error("Not a member of this group");

    // Central, league-scoped matches managed by the super admin.
    const [rows, teamIdMap] = await Promise.all([
      db
        .select()
        .from(fixtures)
        .where(and(eq(fixtures.competition, row.competition), eq(fixtures.round, data.round))),
      buildTeamIdMap(db),
    ]);
    return rows.map((f) => ({
      ...f,
      homeTeamId: f.homeTeamId ?? teamIdMap.get(f.homeShort) ?? null,
      awayTeamId: f.awayTeamId ?? teamIdMap.get(f.awayShort) ?? null,
    }));
  });
