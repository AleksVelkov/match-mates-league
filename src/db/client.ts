import { drizzle } from "drizzle-orm/d1";
import { getEnvStore } from "@/lib/env-store";
import * as schema from "./schema";

export type { Env } from "@/lib/env-store";

export function getDb() {
  const env = getEnvStore();
  return drizzle(env.DB, { schema });
}
