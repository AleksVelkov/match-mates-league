import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { user, account } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createSession, destroySession, getSession } from "@/lib/session";

export const signUp = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2).max(50),
      email: z.string().email(),
      password: z.string().min(8),
    })
  )
  .handler(async ({ data }) => {
    const db = getDb();

    const existing = await db
      .select()
      .from(user)
      .where(eq(user.email, data.email.toLowerCase()))
      .limit(1);

    if (existing.length) throw new Error("An account with this email already exists");

    const id = crypto.randomUUID();
    const now = new Date();
    const passwordHash = await hashPassword(data.password);

    await db.insert(user).values({
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    await createSession(id);
    return { ok: true };
  });

export const signIn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      password: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const db = getDb();

    const [u] = await db
      .select()
      .from(user)
      .where(eq(user.email, data.email.toLowerCase()))
      .limit(1);

    if (!u) throw new Error("Invalid email or password");

    const [acc] = await db
      .select()
      .from(account)
      .where(eq(account.userId, u.id))
      .limit(1);

    if (!acc?.password) throw new Error("Invalid email or password");

    const valid = await verifyPassword(data.password, acc.password);
    if (!valid) throw new Error("Invalid email or password");

    await createSession(u.id);
    return { ok: true, name: u.name };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  await destroySession();
  return { ok: true };
});

export const getMe = createServerFn({ method: "GET" }).handler(async () => {
  const s = await getSession();
  if (!s) return null;
  return { id: s.user.id, name: s.user.name, email: s.user.email };
});
