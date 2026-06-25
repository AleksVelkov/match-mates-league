import { createServerFn } from "@tanstack/react-start";
import { eq, or, and, desc, asc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { teams, teamStandings, fixtures } from "@/db/schema";
import { requireUser } from "@/lib/session";

export type SquadMember = {
  id: number;
  name: string;
  position: string;
  shirtNumber?: number | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
};

/** Full team profile page data — team info + standings + recent/upcoming matches. */
export const getTeamPage = createServerFn({ method: "GET" })
  .validator(z.object({ teamId: z.string() }))
  .handler(async ({ data }) => {
    await requireUser();
    const db = getDb();

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, data.teamId))
      .limit(1);

    if (!team) return null;

    const standings = await db
      .select()
      .from(teamStandings)
      .where(eq(teamStandings.teamId, data.teamId))
      .orderBy(asc(teamStandings.position));

    const [recentMatches, upcomingMatches] = await Promise.all([
      db
        .select()
        .from(fixtures)
        .where(
          and(
            or(eq(fixtures.homeTeamId, data.teamId), eq(fixtures.awayTeamId, data.teamId)),
            eq(fixtures.status, "finished"),
          ),
        )
        .orderBy(desc(fixtures.kickoffAt))
        .limit(5),
      db
        .select()
        .from(fixtures)
        .where(
          and(
            or(eq(fixtures.homeTeamId, data.teamId), eq(fixtures.awayTeamId, data.teamId)),
            or(eq(fixtures.status, "upcoming"), eq(fixtures.status, "live")),
          ),
        )
        .orderBy(asc(fixtures.kickoffAt))
        .limit(5),
    ]);

    const squad: SquadMember[] = team.squadJson
      ? (JSON.parse(team.squadJson) as SquadMember[])
      : [];

    return {
      team: {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        tla: team.tla,
        crestUrl: team.crestUrl,
        founded: team.founded,
        venue: team.venue,
        clubColors: team.clubColors,
        website: team.website,
        address: team.address,
        coachName: team.coachName,
        coachNationality: team.coachNationality,
        syncedAt: team.syncedAt,
      },
      squad,
      standings,
      recentMatches,
      upcomingMatches,
    };
  });
