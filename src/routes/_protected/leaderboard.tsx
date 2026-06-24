import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { currentGroup, members } from "@/lib/mock-data";
import { Flame } from "lucide-react";

export const Route = createFileRoute("/_protected/leaderboard")({
  head: () => ({
    meta: [
      { title: "ScorIQ — Leaderboard" },
      { name: "description", content: "Standings for your crew." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const sorted = [...members].sort((a, b) => b.points - a.points);

  return (
    <AppShell>
      <ScreenHeader
        eyebrow={`${currentGroup.name} · Round ${currentGroup.round}`}
        title="Standings"
      />

      {/* Podium */}
      <section className="px-5">
        <div className="grid grid-cols-3 items-end gap-2">
          {[1, 0, 2].map((sortedIdx, podiumIdx) => {
            const m = sorted[sortedIdx];
            if (!m) return <div key={sortedIdx} />;
            const place = sortedIdx + 1;
            const heights = ["h-28", "h-36", "h-24"];
            const colors = [
              "bg-gradient-to-b from-primary/40 to-primary/10 border-primary",
              "bg-gradient-to-b from-joker/50 to-joker/10 border-joker",
              "bg-gradient-to-b from-accent/40 to-accent/10 border-accent",
            ];
            return (
              <div key={m.id} className="flex flex-col items-center">
                <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-surface-2 font-display text-base">
                  {m.avatar}
                </div>
                <p className="truncate text-xs font-semibold">{m.name}</p>
                <p className="font-display text-2xl text-primary">{m.points}</p>
                <div
                  className={[
                    "mt-1 w-full rounded-t-2xl border-t-2",
                    heights[podiumIdx],
                    colors[podiumIdx],
                  ].join(" ")}
                >
                  <div className="grid h-full place-items-center font-display text-3xl text-foreground">
                    {place}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* List */}
      <section className="mt-6 px-5">
        <ul className="overflow-hidden rounded-3xl border border-border bg-surface">
          {sorted.map((m, i) => {
            const isMe = m.name === "Aleks"; // demo: highlight a row
            return (
              <li
                key={m.id}
                className={[
                  "grid grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0",
                  isMe ? "bg-primary/10" : "",
                ].join(" ")}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-background font-display text-sm text-muted-foreground">
                  {i + 1}
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 font-display text-xs">
                  {m.avatar}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.name}</p>
                  {m.streak > 0 && (
                    <p className="flex items-center gap-1 text-[11px] text-joker">
                      <Flame className="h-3 w-3" /> {m.streak} streak
                    </p>
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {m.exact}× exact
                </span>
                <span className="font-display text-xl text-primary">{m.points}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </AppShell>
  );
}
