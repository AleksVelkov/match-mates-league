import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { NoGroup } from "@/components/NoGroup";
import { TeamCrest } from "@/components/TeamCrest";
import { LeagueCrest } from "@/components/LeagueCrest";
import { getMe } from "@/api/auth";
import { getMyGroups } from "@/api/groups";
import { getLeagueFixtures } from "@/api/fixtures";
import { getMyBestStats } from "@/api/leaderboard";
import { getFavoriteLeague } from "@/api/preferences";
import { Flame, Target, Trophy } from "lucide-react";

export const Route = createFileRoute("/_protected/")({
  head: () => ({
    meta: [
      { title: "ScorIQ — Home" },
      { name: "description", content: "Live scores and your prediction stats." },
    ],
  }),
  loader: async () => {
    const [me, myGroups, favLeague] = await Promise.all([
      getMe(),
      getMyGroups(),
      getFavoriteLeague(),
    ]);

    const [leagueFixtures, bestStats] = await Promise.all([
      getLeagueFixtures({ data: { competition: favLeague } }).catch(() => [] as Awaited<ReturnType<typeof getLeagueFixtures>>),
      myGroups.length ? getMyBestStats() : Promise.resolve(null),
    ]);

    return { me, myGroups, favLeague, leagueFixtures, bestStats };
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

const kickoffFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function HomePage() {
  const { me, myGroups, favLeague, leagueFixtures, bestStats } = Route.useLoaderData();
  const name = me?.name ?? "there";

  return (
    <AppShell>
      {/* Greeting */}
      <header className="px-5 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary font-display text-lg text-primary-foreground shadow-glow">
            {me?.image
              ? <img src={me.image} alt={name} className="h-full w-full object-cover" />
              : initials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Welcome back</p>
            <p className="truncate font-display text-2xl leading-none">Hey, {name}</p>
          </div>
          <img
            src="/logo.png"
            alt="ScorIQ"
            className="h-10 w-10 shrink-0 object-contain opacity-90"
          />
        </div>
      </header>

      {/* Best stats across all groups */}
      {bestStats ? (
        <section className="grid grid-cols-3 gap-2 px-5 pb-6">
          <BestStatCard
            label="Streak"
            value={bestStats.streak.value}
            groupName={bestStats.streak.groupName}
            groupEmoji={bestStats.streak.groupEmoji}
            icon={<Flame className="h-3.5 w-3.5" />}
            accent
          />
          <BestStatCard
            label="Points"
            value={bestStats.points.value}
            groupName={bestStats.points.groupName}
            groupEmoji={bestStats.points.groupEmoji}
            icon={<Trophy className="h-3.5 w-3.5" />}
          />
          <BestStatCard
            label="Exact"
            value={bestStats.exact.value}
            groupName={bestStats.exact.groupName}
            groupEmoji={bestStats.exact.groupEmoji}
            icon={<Target className="h-3.5 w-3.5" />}
          />
        </section>
      ) : !myGroups.length ? (
        <NoGroup />
      ) : null}

      {/* League fixtures */}
      <section className="px-5 pb-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LeagueCrest competition={favLeague} size={26} />
            <h2 className="font-display text-xl">{favLeague}</h2>
          </div>
          {leagueFixtures.length > 0 && (
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Round {leagueFixtures[0].round}
            </span>
          )}
        </div>

        {leagueFixtures.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No matches published for this league yet.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {leagueFixtures.map((f) => (
              <MatchCard key={f.id} fixture={f} />
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function BestStatCard({
  label,
  value,
  groupName,
  groupEmoji,
  icon,
  accent,
}: {
  label: string;
  value: number;
  groupName: string;
  groupEmoji: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col rounded-2xl border border-border p-3",
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
      <p className="mt-1.5 truncate text-[10px] text-muted-foreground">
        {groupEmoji} {groupName}
      </p>
    </div>
  );
}

function TeamLink({ teamId, children }: { teamId: string | null; children: ReactNode }) {
  if (!teamId) return <>{children}</>;
  return (
    <Link to="/team/$teamId" params={{ teamId }} className="min-w-0">
      {children}
    </Link>
  );
}

type Fixture = Awaited<ReturnType<typeof getLeagueFixtures>>[number];

function MatchCard({ fixture: f }: { fixture: Fixture }) {
  const hasResult = f.resultHome !== null && f.resultAway !== null;
  const isLive = f.status === "live";
  const isFinished = f.status === "finished";

  return (
    <li className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[11px] text-muted-foreground" suppressHydrationWarning>
          {kickoffFmt.format(new Date(f.kickoffAt))}
        </span>
        <div className="flex items-center gap-2">
          {hasResult && (
            <span
              className={[
                "font-display text-lg",
                isLive ? "text-success" : "text-foreground",
              ].join(" ")}
            >
              {f.resultHome} – {f.resultAway}
            </span>
          )}
          <span
            className={[
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
              isLive
                ? "bg-success/20 text-success"
                : isFinished
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/30 text-muted-foreground",
            ].join(" ")}
          >
            {f.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-4 pt-3">
        <TeamLink teamId={f.homeTeamId ?? null}>
          <div className="flex items-center gap-2 min-w-0">
            <TeamCrest short={f.homeShort} crestUrl={f.homeCrest} size={36} />
            <p className="truncate text-sm font-semibold">{f.homeShort}</p>
          </div>
        </TeamLink>
        <span className="font-display text-2xl text-muted-foreground/60">
          {hasResult ? "–" : "vs"}
        </span>
        <TeamLink teamId={f.awayTeamId ?? null}>
          <div className="flex items-center justify-end gap-2 min-w-0">
            <p className="truncate text-right text-sm font-semibold">{f.awayShort}</p>
            <TeamCrest short={f.awayShort} crestUrl={f.awayCrest} size={36} />
          </div>
        </TeamLink>
      </div>
    </li>
  );
}
