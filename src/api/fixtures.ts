import { createServerFn } from "@tanstack/react-start";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { fixtures, groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { scoreFixture } from "@/lib/scoring";

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
