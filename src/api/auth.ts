import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { user, account } from "@/db/schema";
import { hashPassword, verifyPassword, needsRehash } from "@/lib/auth";
import { createSession, destroySession, getSession } from "@/lib/session";
import { getEnvStore } from "@/lib/env-store";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

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

    // Throttle account creation per IP to curb abuse.
    await enforceRateLimit(`signup:ip:${getClientIp()}`, 5, 3600);

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
    const email = data.email.toLowerCase();

    // Throttle by IP and by targeted account to blunt brute-force / credential stuffing.
    await enforceRateLimit(`signin:ip:${getClientIp()}`, 20, 900);
    await enforceRateLimit(`signin:email:${email}`, 5, 900);

    const [u] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
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

    // Transparently upgrade legacy / weaker hashes on successful login.
    if (needsRehash(acc.password)) {
      try {
        const upgraded = await hashPassword(data.password);
        await db.update(account).set({ password: upgraded, updatedAt: new Date() }).where(eq(account.id, acc.id));
      } catch { /* non-fatal: login still succeeds */ }
    }

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
  return { id: s.user.id, name: s.user.name, email: s.user.email, image: s.user.image ?? null };
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────

/** Builds the Google authorization URL and stashes a CSRF state cookie. */
export const getGoogleAuthUrl = createServerFn({ method: "GET" }).handler(async () => {
  const env = getEnvStore();
  if (!env.GOOGLE_CLIENT_ID) throw new Error("Google OAuth is not configured.");

  // Use the explicit env var so the URI always matches Google Cloud Console exactly.
  const redirectUri = env.GOOGLE_REDIRECT_URI || "http://localhost:8787/auth/callback/google";

  const state = crypto.randomUUID();
  // Store state + redirect URI so the callback can verify and reuse them.
  const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  setCookie("scoriq_oauth_state", state, cookieOpts);
  setCookie("scoriq_oauth_redirect_uri", redirectUri, cookieOpts);

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
});

/** Exchanges the Google authorization code for a session. */
export const exchangeGoogleCode = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string(), state: z.string() }))
  .handler(async ({ data }) => {
    const env = getEnvStore();

    await enforceRateLimit(`oauth:ip:${getClientIp()}`, 30, 900);

    // CSRF check
    const storedState = getCookie("scoriq_oauth_state");
    if (!storedState || storedState !== data.state) throw new Error("Invalid OAuth state — please try again.");

    const redirectUri = getCookie("scoriq_oauth_redirect_uri")
      ?? getEnvStore().GOOGLE_REDIRECT_URI
      ?? "http://localhost:8787/auth/callback/google";

    // Clear the one-time cookies
    setCookie("scoriq_oauth_state", "", { maxAge: 0, path: "/" });
    setCookie("scoriq_oauth_redirect_uri", "", { maxAge: 0, path: "/" });

    // Exchange code → tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: data.code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      // Log detail server-side; return a generic message to the client.
      console.error("Google token exchange failed:", await tokenRes.text().catch(() => tokenRes.statusText));
      throw new Error("Google sign-in failed. Please try again.");
    }
    const tokens = await tokenRes.json() as { access_token: string; id_token?: string };

    // Fetch user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userRes.ok) throw new Error("Google sign-in failed. Please try again.");
    const googleUser = await userRes.json() as {
      id: string;
      email: string;
      name: string;
      picture?: string;
      verified_email?: boolean;
    };

    // Only trust the email (for account creation/linking) if Google says it's verified.
    // Otherwise an unverified-email Google account could hijack a password account.
    if (googleUser.verified_email !== true) {
      throw new Error("Your Google email address is not verified.");
    }

    const db = getDb();
    const now = new Date();
    let userId: string;

    // Find existing user by email
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, googleUser.email.toLowerCase()))
      .limit(1);

    if (existing) {
      userId = existing.id;
      // Update profile image if Google provides one and user hasn't set their own
      if (googleUser.picture) {
        await db
          .update(user)
          .set({ image: googleUser.picture, updatedAt: now })
          .where(and(eq(user.id, userId), eq(user.image, "")));
        // Also update if image is null
        const [u] = await db.select({ image: user.image }).from(user).where(eq(user.id, userId)).limit(1);
        if (!u?.image) {
          await db.update(user).set({ image: googleUser.picture, updatedAt: now }).where(eq(user.id, userId));
        }
      }
    } else {
      // Create new user
      userId = crypto.randomUUID();
      await db.insert(user).values({
        id: userId,
        name: googleUser.name,
        email: googleUser.email.toLowerCase(),
        emailVerified: googleUser.verified_email ?? true,
        image: googleUser.picture ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Link Google account (ignore if already linked)
    const [existingAccount] = await db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.providerId, "google"), eq(account.accountId, googleUser.id)))
      .limit(1);

    if (!existingAccount) {
      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: googleUser.id,
        providerId: "google",
        userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await createSession(userId);
    return { ok: true };
  });
