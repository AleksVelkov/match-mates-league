import { createServerFn } from "@tanstack/react-start";
import { eq, and, sum, count, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { user, groupMembers, predictions, fixtures } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const getLeaderboard = createServerFn({ method: "GET" })
  .validator(z.object({ groupId: z.string() }))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const db = getDb();

    // Verify membership
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, data.groupId), eq(groupMembers.userId, me.id)))
      .limit(1);
    if (!member) throw new Error("Not a member of this group");

    // Aggregate points and exact count per member
    const rows = await db
      .select({
        userId: user.id,
        name: user.name,
        totalPoints: sql<number>`COALESCE(SUM(${predictions.pointsEarned}), 0)`.as("total_points"),
        exactCount:
          sql<number>`COALESCE(SUM(CASE WHEN ${predictions.scoreHome} = ${fixtures.resultHome} AND ${predictions.scoreAway} = ${fixtures.resultAway} AND ${fixtures.resultHome} IS NOT NULL THEN 1 ELSE 0 END), 0)`.as(
            "exact_count",
          ),
      })
      .from(groupMembers)
      .innerJoin(user, eq(groupMembers.userId, user.id))
      .leftJoin(
        predictions,
        and(eq(predictions.userId, user.id), eq(predictions.groupId, data.groupId)),
      )
      .leftJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
      .where(eq(groupMembers.groupId, data.groupId))
      .groupBy(user.id, user.name)
      .orderBy(sql`total_points DESC`);

    // Compute streak per user
    const memberIds = rows.map((r) => r.userId);

    const allPreds = memberIds.length
      ? await db
          .select({ p: predictions, f: fixtures })
          .from(predictions)
          .innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
          .where(
            and(
              eq(predictions.groupId, data.groupId),
              sql`${predictions.userId} IN (${sql.join(
                memberIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            ),
          )
          .orderBy(fixtures.kickoffAt)
      : [];

    function calcStreak(userId: string) {
      const userPreds = allPreds.filter((r) => r.p.userId === userId && r.f.resultHome !== null);
      let streak = 0;
      for (let i = userPreds.length - 1; i >= 0; i--) {
        const { p, f } = userPreds[i];
        const predSign = Math.sign((p.scoreHome ?? 0) - (p.scoreAway ?? 0));
        const realSign = Math.sign(f.resultHome! - f.resultAway!);
        const isExact = p.scoreHome === f.resultHome && p.scoreAway === f.resultAway;
        if (isExact || predSign === realSign) streak++;
        else break;
      }
      return streak;
    }

    return rows.map((r, i) => ({
      rank: i + 1,
      id: r.userId,
      name: r.name,
      avatar: r.name
        .split(" ")
        .map((w: string) => w[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2),
      points: r.totalPoints,
      exact: r.exactCount,
      streak: calcStreak(r.userId),
      isMe: r.userId === me.id,
    }));
  });
