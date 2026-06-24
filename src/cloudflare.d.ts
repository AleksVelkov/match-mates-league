// Ambient declaration for the Cloudflare-native `cloudflare:workers` module.
// Provides the `env` bindings object at runtime (D1, vars). Nitro shims this in
// dev; Cloudflare provides it natively in production.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
