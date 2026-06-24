import { createServerFn } from "@tanstack/react-start";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { fixtures, groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { scoreFixture } from "@/lib/scoring";
import { fetchMatchday, mapStatus, COMPETITION_CODES } from "@/lib/football-data";

export const getFixtures = createServerFn({ method: "GET" })
  .validator(z.object({ groupId: z.string(), round: z.number() }))
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

    return db
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.groupId, data.groupId), eq(fixtures.round, data.round)));
  });

export const addFixture = createServerFn({ method: "POST" })
  .validator(
    z.object({
      groupId: z.string(),
      round: z.number(),
      home: z.string(),
      homeShort: z.string().max(4),
      away: z.string(),
      awayShort: z.string().max(4),
      kickoffAt: z.string(), // ISO string
      competition: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    // Only group owner can add fixtures
    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, data.groupId), eq(groups.ownerId, user.id)))
      .limit(1);
    if (!group) throw new Error("Only the group owner can manage fixtures");

    const id = crypto.randomUUID();
    await db.insert(fixtures).values({
      id,
      groupId: data.groupId,
      competition: data.competition ?? group.competition,
      round: data.round,
      home: data.home,
      homeShort: data.homeShort.toUpperCase(),
      away: data.away,
      awayShort: data.awayShort.toUpperCase(),
      kickoffAt: new Date(data.kickoffAt),
      status: "upcoming",
      createdAt: new Date(),
    });

    return { id };
  });

export const syncFixtures = createServerFn({ method: "POST" })
  .validator(z.object({ groupId: z.string(), matchday: z.number().int().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, data.groupId), eq(groups.ownerId, user.id)))
      .limit(1);
    if (!group) throw new Error("Only the group owner can sync fixtures");

    const code = COMPETITION_CODES[group.competition];
    if (!code) throw new Error(`No API code for competition "${group.competition}"`);

    const matches = await fetchMatchday(code, data.matchday);

    let upserted = 0;
    for (const m of matches) {
      const externalId = String(m.id);
      const existing = await db
        .select({ id: fixtures.id })
        .from(fixtures)
        .where(and(eq(fixtures.groupId, data.groupId), eq(fixtures.externalId, externalId)))
        .limit(1);

      const values = {
        groupId: data.groupId,
        competition: group.competition,
        round: m.matchday,
        home: m.homeTeam.name,
        homeShort: m.homeTeam.tla,
        away: m.awayTeam.name,
        awayShort: m.awayTeam.tla,
        kickoffAt: new Date(m.utcDate),
        status: mapStatus(m.status) as "upcoming" | "live" | "finished",
        resultHome: m.score.fullTime.home ?? null,
        resultAway: m.score.fullTime.away ?? null,
        externalId,
        createdAt: new Date(),
      };

      if (existing.length > 0) {
        await db
          .update(fixtures)
          .set({ status: values.status, resultHome: values.resultHome, resultAway: values.resultAway, kickoffAt: values.kickoffAt })
          .where(eq(fixtures.id, existing[0].id));
      } else {
        await db.insert(fixtures).values({ id: crypto.randomUUID(), ...values });
        upserted++;
      }
    }

    // Update the group's current round
    await db.update(groups).set({ round: data.matchday }).where(eq(groups.id, data.groupId));

    return { synced: matches.length, new: upserted };
  });

export const submitResult = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fixtureId: z.string(),
      resultHome: z.number().int().min(0),
      resultAway: z.number().int().min(0),
    })
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    // Verify fixture exists and user is group owner
    const [fixture] = await db
      .select({ f: fixtures, g: groups })
      .from(fixtures)
      .innerJoin(groups, eq(fixtures.groupId, groups.id))
      .where(eq(fixtures.id, data.fixtureId))
      .limit(1);

    if (!fixture) throw new Error("Fixture not found");
    if (fixture.g.ownerId !== user.id) throw new Error("Only the group owner can submit results");

    await scoreFixture(db, data.fixtureId, data.resultHome, data.resultAway);

    return { ok: true };
  });
