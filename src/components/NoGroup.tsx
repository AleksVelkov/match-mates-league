import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";

/** Shown on the user-facing screens when the signed-in user isn't in any group yet. */
export function NoGroup({ note }: { note?: string }) {
  return (
    <section className="px-5 pt-8">
      <div className="rounded-3xl border border-border bg-surface p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Users className="h-7 w-7" />
        </div>
        <h2 className="mt-4 font-display text-2xl">No group yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {note ?? "Create a group or join one with an invite code to start predicting."}
        </p>
        <Link
          to="/admin"
          className="mt-5 inline-grid w-full place-items-center rounded-2xl bg-primary py-3.5 font-display text-lg uppercase tracking-wider text-primary-foreground shadow-glow"
        >
          Go to Admin
        </Link>
      </div>
    </section>
  );
}
