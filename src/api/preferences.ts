import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { config } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const DEFAULT_FAV_LEAGUE = "Premier League";

export const getFavoriteLeague = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const db = getDb();
  const [row] = await db
    .select()
    .from(config)
    .where(eq(config.key, `user:${user.id}:fav_league`))
    .limit(1);
  return row?.value ?? DEFAULT_FAV_LEAGUE;
});

export const setFavoriteLeague = createServerFn({ method: "POST" })
  .validator(z.object({ league: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();
    await db
      .insert(config)
      .values({ key: `user:${user.id}:fav_league`, value: data.league })
      .onConflictDoUpdate({ target: config.key, set: { value: data.league } });
    return { ok: true };
  });
