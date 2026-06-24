// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// `cloudflare:workers` is a Cloudflare-native module (provides `env` bindings).
// Nitro's preset externalizes it for the worker build, but TanStack Start's own
// server bundle (Rolldown) runs first and would try to resolve it — mark it
// external here so the import passes through to the Cloudflare runtime.
const externalizeCloudflareWorkers = {
  name: "externalize-cloudflare-workers",
  enforce: "pre" as const,
  resolveId(id: string) {
    if (id === "cloudflare:workers") return { id, external: true };
    return null;
  },
};

export default defineConfig({
  plugins: [externalizeCloudflareWorkers],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // cloudflare-pages preset outputs _worker.js + static assets to dist/
  nitro: {
    preset: "cloudflare-pages",
  },
});
