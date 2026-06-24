import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { NoGroup } from "@/components/NoGroup";
import { TeamCrest } from "@/components/TeamCrest";
import { Countdown } from "@/components/Countdown";
import { getMe } from "@/api/auth";
import { getMyGroups, getGroup } from "@/api/groups";
import { getFixtures } from "@/api/fixtures";
import { getLeaderboard } from "@/api/leaderboard";
import { getMyPredictions } from "@/api/predictions";
import { ChevronRight, Flame, Target, Trophy, Users } from "lucide-react";

export const Route = createFileRoute("/_protected/")({
  head: () => ({
    meta: [
      { title: "ScorIQ — Home" },
      { name: "description", content: "Your active prediction round at a glance." },
    ],
  }),
  loader: async () => {
    const [me, groups] = await Promise.all([getMe(), getMyGroups()]);
    if (!groups.length) return { me, group: null };
    const base = groups[0];
    const [group, standings, fixtures, myPreds] = await Promise.all([
      getGroup({ data: { groupId: base.id } }),
      getLeaderboard({ data: { groupId: base.id } }),
      getFixtures({ data: { groupId: base.id, round: base.round } }),
      getMyPredictions({ data: { groupId: base.id, round: base.round } }),
    ]);
    return { me, group, standings, fixtures, myPreds };
  },
  component: HomePage,
});

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function HomePage() {
  const data = Route.useLoaderData();
  const name = data.me?.name ?? "there";

  if (!data.group) {
    return (
      <AppShell>
        <header className="px-5 pt-10 pb-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Welcome back</p>
          <p className="truncate font-display text-2xl leading-none">Hey, {name}</p>
        </header>
        <NoGroup />
      </AppShell>
    );
  }

  const { group, standings, fixtures, myPreds } = data;
  const predictedIds = new Set(
    myPreds.filter((p) => p.scoreHome !== null && p.scoreAway !== null).map((p) => p.fixtureId),
  );
  const submitted = fixtures.filter((f) => predictedIds.has(f.id)).length;
  const total = fixtures.length;

  const now = Date.now();
  const nextKickoff =
    [...fixtures]
      .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
      .find((f) => new Date(f.kickoffAt).getTime() > now) ?? fixtures[0];

  const meRow = standings.find((s) => s.isMe);
  const top3 = standings.slice(0, 3);

  return (
    <AppShell>
      {/* Greeting */}
      <header className="px-5 pt-10 pb-2">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary font-display text-lg text-primary-foreground shadow-glow">
            {initials(name)}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Welcome back</p>
            <p className="truncate font-display text-2xl leading-none">Hey, {name}</p>
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
                {group.competition} · Round {group.round}
              </p>
              <h2 className="mt-1 truncate font-display text-3xl leading-tight">
                {group.emoji} {group.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {group.memberCount} members
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
                style={{ width: `${total ? (submitted / total) * 100 : 0}%` }}
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
              <Countdown
                iso={new Date(nextKickoff.kickoffAt).toISOString()}
                className="rounded-xl bg-primary/15 px-3 py-1.5 font-display text-lg text-primary"
              />
            </div>
          )}

          <div className="mt-5 grid place-items-center rounded-2xl bg-primary py-3.5 font-display text-lg uppercase tracking-wider text-primary-foreground shadow-glow">
            Continue Predicting
          </div>
        </Link>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-3 gap-2 px-5 pt-5">
        <StatCard
          label="Streak"
          value={`${meRow?.streak ?? 0}`}
          icon={<Flame className="h-4 w-4" />}
          accent
        />
        <StatCard
          label="Points"
          value={`${meRow?.points ?? 0}`}
          icon={<Trophy className="h-4 w-4" />}
        />
        <StatCard
          label="Exact"
          value={`${meRow?.exact ?? 0}`}
          icon={<Target className="h-4 w-4" />}
        />
      </section>

      {/* Top 3 standings */}
      <section className="px-5 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl">Standings</h3>
          <Link
            to="/admin/$groupId"
            params={{ groupId: group.id }}
            className="text-xs font-semibold uppercase tracking-widest text-primary"
          >
            View all
          </Link>
        </div>
        <ul className="overflow-hidden rounded-3xl border border-border bg-surface">
          {top3.map((m) => (
            <li
              key={m.id}
              className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-background font-display text-sm text-muted-foreground">
                {m.rank}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 font-display text-xs">
                {m.avatar}
              </span>
              <span className="truncate text-sm font-semibold">{m.name}</span>
              <span className="font-display text-xl text-primary">{m.points}</span>
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
      <div
        className={[
          "mt-1 font-display text-3xl leading-none",
          accent ? "text-joker" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
