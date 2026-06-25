import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { exchangeGoogleCode } from "@/api/auth";

export const Route = createFileRoute("/auth/callback/google")({
  validateSearch: z.object({
    code: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
  }),
  loaderDeps: ({ search }) => ({
    code: search.code,
    state: search.state,
    error: search.error,
  }),
  loader: async ({ deps }) => {
    if (deps.error || !deps.code || !deps.state) {
      throw redirect({ to: "/login" });
    }
    try {
      await exchangeGoogleCode({ data: { code: deps.code, state: deps.state } });
    } catch {
      throw redirect({ to: "/login" });
    }
    throw redirect({ to: "/" });
  },
  component: CallbackPage,
});

function CallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
