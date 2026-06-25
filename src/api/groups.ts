import { createServerFn } from "@tanstack/react-start";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { user, groups, groupMembers } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getEnabledCompetitions, getCurrentRound } from "@/lib/leagues";

function generateInviteCode(name: string): string {
  const prefix = name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3)
    .padEnd(3, "X");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${suffix}`;
}

/** Leagues the super admin has made available for end users to create groups in. */
export const getAvailableLeagues = createServerFn({ method: "GET" }).handler(async () => {
  await requireUser();
  const db = getDb();
  return getEnabledCompetitions(db);
});

export const getMyGroups = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const db = getDb();

  const rows = await db
    .select({ group: groups })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, user.id));

  // Round is league-level now: resolve each group's active round from the league.
  return Promise.all(
    rows.map(async (r) => ({
      ...r.group,
      round: await getCurrentRound(db, r.group.competition),
    })),
  );
});

export const getGroup = createServerFn({ method: "GET" })
  .validator(z.object({ groupId: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    const [group] = await db.select().from(groups).where(eq(groups.id, data.groupId)).limit(1);

    if (!group) throw new Error("Group not found");

    const membership = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, data.groupId), eq(groupMembers.userId, user.id)))
      .limit(1);

    if (!membership.length) throw new Error("Not a member of this group");

    const members = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, data.groupId));

    const round = await getCurrentRound(db, group.competition);

    return { ...group, round, memberCount: members.length };
  });

export const createGroup = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2).max(50),
      emoji: z.string().default("⚽"),
      description: z.string().max(200).optional(),
      competition: z.string().default("Premier League"),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    // Only allow leagues the super admin has made available.
    const enabled = await getEnabledCompetitions(db);
    if (!enabled.includes(data.competition)) {
      throw new Error("That league isn't available. Pick one from the list.");
    }

    const id = crypto.randomUUID();
    const inviteCode = generateInviteCode(data.name);
    const now = new Date();

    await db.insert(groups).values({
      id,
      name: data.name,
      emoji: data.emoji,
      description: data.description ?? null,
      competition: data.competition,
      inviteCode,
      ownerId: user.id,
      round: 1,
      createdAt: now,
    });

    // Owner is automatically a member
    await db.insert(groupMembers).values({
      groupId: id,
      userId: user.id,
      joinedAt: now,
    });

    return { id, inviteCode };
  });

export const updateGroup = createServerFn({ method: "POST" })
  .validator(
    z.object({
      groupId: z.string(),
      name: z.string().min(2).max(50),
      emoji: z.string().min(1).max(4),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    const [group] = await db.select().from(groups).where(eq(groups.id, data.groupId)).limit(1);
    if (!group) throw new Error("Group not found");
    if (group.ownerId !== user.id) throw new Error("Only the group owner can edit this group");

    await db
      .update(groups)
      .set({ name: data.name, emoji: data.emoji })
      .where(eq(groups.id, data.groupId));

    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .validator(z.object({ groupId: z.string(), userId: z.string() }))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const db = getDb();

    const [group] = await db.select().from(groups).where(eq(groups.id, data.groupId)).limit(1);
    if (!group) throw new Error("Group not found");
    if (group.ownerId !== me.id) throw new Error("Only the group owner can remove members");
    if (data.userId === group.ownerId) throw new Error("Cannot remove the group owner");

    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, data.groupId), eq(groupMembers.userId, data.userId)));

    return { ok: true };
  });

export const getGroupMembers = createServerFn({ method: "GET" })
  .validator(z.object({ groupId: z.string() }))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const db = getDb();

    const membership = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, data.groupId), eq(groupMembers.userId, me.id)))
      .limit(1);
    if (!membership.length) throw new Error("Not a member of this group");

    const rows = await db
      .select({ id: user.id, name: user.name, email: user.email, image: user.image, joinedAt: groupMembers.joinedAt })
      .from(groupMembers)
      .innerJoin(user, eq(groupMembers.userId, user.id))
      .where(eq(groupMembers.groupId, data.groupId))
      .orderBy(groupMembers.joinedAt);

    return rows;
  });

export const joinGroup = createServerFn({ method: "POST" })
  .validator(z.object({ inviteCode: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.inviteCode, data.inviteCode.toUpperCase()))
      .limit(1);

    if (!group) throw new Error("Invalid invite code");

    await db
      .insert(groupMembers)
      .values({ groupId: group.id, userId: user.id, joinedAt: new Date() })
      .onConflictDoNothing();

    return { groupId: group.id };
  });
