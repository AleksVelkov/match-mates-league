import { getCookie, setCookie } from "@tanstack/react-start/server";
import { eq, gt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { session, user } from "@/db/schema";

const COOKIE_NAME = "scoriq_session";
const SESSION_TTL_DAYS = 30;

export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 86_400_000);

  await db.insert(session).values({
    id: crypto.randomUUID(),
    token,
    userId,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86_400,
  });

  return token;
}

export async function getSession() {
  const token = getCookie(COOKIE_NAME);
  if (!token) return null;

  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({ s: session, u: user })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(eq(session.token, token))
    .limit(1);

  const row = rows[0];
  if (!row || row.s.expiresAt <= now) return null;

  return { session: row.s, user: row.u };
}

export async function requireUser() {
  const s = await getSession();
  if (!s) throw new Error("Unauthorized");
  return s.user;
}

export async function destroySession() {
  const token = getCookie(COOKIE_NAME);
  if (token) {
    const db = getDb();
    await db.delete(session).where(eq(session.token, token));
  }
  setCookie(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}
