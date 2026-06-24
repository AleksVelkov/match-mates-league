import { AsyncLocalStorage } from "node:async_hooks";

export type Env = {
  DB: D1Database;
  SCORIQ_SECRET: string;
  FOOTBALL_DATA_API_KEY: string;
  SUPER_ADMIN_EMAIL: string;
};

// Stores the Cloudflare env per-request via AsyncLocalStorage.
// Populated in src/server.ts at request entry, consumed anywhere server-side.
export const cfEnvStorage = new AsyncLocalStorage<Env>();

export function getEnvStore(): Env {
  const env = cfEnvStorage.getStore();
  if (!env) {
    throw new Error(
      "Cloudflare env not available. Run the app with `npm run dev:wrangler` for D1 access."
    );
  }
  return env;
}
