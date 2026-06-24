import { createServerFn } from "@tanstack/react-start";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { fixtures, groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/session";

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
    return db
      .select()
      .from(fixtures)
      .where(and(eq(fixtures.competition, row.competition), eq(fixtures.round, data.round)));
  });
