// Cloudflare bindings + env vars.
//
// We read these from the `cloudflare:workers` module, which Cloudflare provides
// natively in production (external module) and Nitro shims in dev (reads __env__).
// This binding is a live reference — it MUST only be read inside a request
// (server function / loader), never at module top-level.
import { env as cfEnv } from "cloudflare:workers";

export type Env = {
  DB: D1Database;
  SCORIQ_SECRET: string;
  FOOTBALL_DATA_API_KEY: string;
  SUPER_ADMIN_EMAIL: string;
};

export function getEnvStore(): Env {
  const env = cfEnv as unknown as Env;
  if (!env?.DB) {
    throw new Error(
      "Cloudflare env not available. Run the app with `npm run dev:wrangler` for D1 access."
    );
  }
  return env;
}
