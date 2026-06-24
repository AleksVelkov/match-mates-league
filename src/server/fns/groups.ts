import { createServerFn } from "@tanstack/react-start";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { groups, groupMembers } from "@/db/schema";
import { requireUser } from "@/lib/session";

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

export const getMyGroups = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const db = getDb();

  const rows = await db
    .select({ group: groups })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, user.id));

  return rows.map((r) => r.group);
});

export const getGroup = createServerFn({ method: "GET" })
  .validator(z.object({ groupId: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, data.groupId))
      .limit(1);

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

    return { ...group, memberCount: members.length };
  });

export const createGroup = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2).max(50),
      emoji: z.string().default("⚽"),
      description: z.string().max(200).optional(),
      competition: z.string().default("Premier League"),
    })
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();

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
