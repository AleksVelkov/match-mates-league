import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TeamCrest } from "@/components/TeamCrest";
import { currentGroup, fixtures, formatCountdown, me, members } from "@/lib/mock-data";
import { ChevronRight, Flame, Star, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pitch — Home" },
      { name: "description", content: "Your active prediction round at a glance." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const submitted = fixtures.filter((f) => f.predictionHome !== null).length;
  const total = fixtures.length;
  const nextKickoff = fixtures[0];
  const top3 = [...members].sort((a, b) => b.weekly - a.weekly).slice(0, 3);

  return (
    <AppShell>
      {/* Greeting */}
      <header className="px-5 pt-10 pb-2">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary font-display text-lg text-primary-foreground shadow-glow">
            {me.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Welcome back</p>
            <p className="truncate font-display text-2xl leading-none">Hey, {me.name}</p>
          </div>
        </div>
      </header>

      {/* Group card */}
      <section className="px-5 pt-6">
        <Link
          to="/predictions"
          className="block overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface-2 to-surface p-5 shadow-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                {currentGroup.competition} · Round {currentGroup.round}
              </p>
              <h2 className="mt-1 truncate font-display text-3xl leading-tight">
                {currentGroup.emoji} {currentGroup.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {currentGroup.memberCount} members
              </p>
            </div>
            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
          </div>

          {/* Progress */}
          <div className="mt-5">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Predictions
              </span>
              <span className="font-display text-2xl">
                <span className="text-primary">{submitted}</span>
                <span className="text-muted-foreground">/{total}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background/60">
              <div
                className="h-full rounded-full bg-primary shadow-glow"
                style={{ width: `${(submitted / total) * 100}%` }}
              />
            </div>
          </div>

          {/* Next kickoff */}
          {nextKickoff && (
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-background/40 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <TeamCrest short={nextKickoff.homeShort} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {nextKickoff.homeShort} vs {nextKickoff.awayShort}
                  </p>
                  <p className="text-xs text-muted-foreground">Next kickoff</p>
                </div>
              </div>
              <div className="rounded-xl bg-primary/15 px-3 py-1.5 font-display text-lg text-primary">
                {formatCountdown(nextKickoff.kickoff)}
              </div>
            </div>
          )}

          <div className="mt-5 grid place-items-center rounded-2xl bg-primary py-3.5 font-display text-lg uppercase tracking-wider text-primary-foreground shadow-glow">
            Continue Predicting
          </div>
        </Link>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-3 gap-2 px-5 pt-5">
        <StatCard label="Streak" value={`${me.streak}`} icon={<Flame className="h-4 w-4" />} accent />
        <StatCard label="Weekly" value={`${me.weekly}`} icon={<Star className="h-4 w-4" />} />
        <StatCard label="Season" value={`${me.points}`} />
      </section>

      {/* Weekly top 3 */}
      <section className="px-5 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl">This Week</h3>
          <Link to="/leaderboard" className="text-xs font-semibold uppercase tracking-widest text-primary">
            View all
          </Link>
        </div>
        <ul className="overflow-hidden rounded-3xl border border-border bg-surface">
          {top3.map((m, i) => (
            <li
              key={m.id}
              className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-background font-display text-sm text-muted-foreground">
                {i + 1}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 font-display text-xs">
                {m.avatar}
              </span>
              <span className="truncate text-sm font-semibold">{m.name}</span>
              <span className="font-display text-xl text-primary">{m.weekly}</span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-border p-3",
        accent ? "bg-gradient-to-br from-joker/20 to-surface" : "bg-surface",
      ].join(" ")}
    >
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className={["mt-1 font-display text-3xl leading-none", accent ? "text-joker" : "text-foreground"].join(" ")}>
        {value}
      </div>
    </div>
  );
}
