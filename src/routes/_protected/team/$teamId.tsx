import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TeamCrest } from "@/components/TeamCrest";
import { getTeamPage, type SquadMember } from "@/api/teams";
import { ChevronLeft, MapPin, User2, Calendar, Palette } from "lucide-react";

export const Route = createFileRoute("/_protected/team/$teamId")({
  head: () => ({ meta: [{ title: "ScorIQ — Team" }] }),
  loader: async ({ params }) => {
    const data = await getTeamPage({ data: { teamId: params.teamId } });
    if (!data) throw new Error("Team not found");
    return data;
  },
  component: TeamPage,
});

const kickoffFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function TeamPage() {
  const { team, squad, standings, recentMatches, upcomingMatches } = Route.useLoaderData();

  const positionGroups: { label: string; key: string }[] = [
    { label: "Goalkeepers", key: "Goalkeeper" },
    { label: "Defenders", key: "Defence" },
    { label: "Midfielders", key: "Midfield" },
    { label: "Forwards", key: "Offence" },
  ];

  return (
    <AppShell>
      {/* ── Back button ── */}
      <div className="flex items-center gap-3 px-5 pt-8 pb-2">
        <button
          onClick={() => window.history.back()}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Team info</p>
      </div>

      {/* ── Hero ── */}
      <div className="flex flex-col items-center gap-3 px-5 py-6">
        <TeamCrest short={team.tla} crestUrl={team.crestUrl} size={96} />
        <div className="text-center">
          <h1 className="font-display text-3xl leading-tight">{team.name}</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{team.tla}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
          {team.founded && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Est. {team.founded}
            </span>
          )}
          {team.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {team.venue}
            </span>
          )}
          {team.clubColors && (
            <span className="flex items-center gap-1">
              <Palette className="h-3.5 w-3.5" />
              {team.clubColors}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 px-5 pb-6">
        {/* ── League standings ── */}
        {standings.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-xl">League standing</h2>
            <div className="space-y-2">
              {standings.map((s) => (
                <StandingCard key={s.competition} standing={s} />
              ))}
            </div>
          </section>
        )}

        {/* ── Manager ── */}
        {team.coachName && (
          <section>
            <h2 className="mb-2 font-display text-xl">Manager</h2>
            <div className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-muted/30">
                <User2 className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">{team.coachName}</p>
                {team.coachNationality && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{team.coachNationality}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Venue ── */}
        {team.venue && (
          <section>
            <h2 className="mb-2 font-display text-xl">Venue</h2>
            <div className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-muted/30">
                <MapPin className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">{team.venue}</p>
                {team.address && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{team.address}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Last 5 results ── */}
        {recentMatches.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-xl">Last {recentMatches.length} matches</h2>
            <div className="space-y-2">
              {recentMatches.map((f) => {
                const isHome = f.homeTeamId === team.id;
                const opponentShort = isHome ? f.awayShort : f.homeShort;
                const opponentCrest = isHome ? f.awayCrest : f.homeCrest;
                const opponentTeamId = isHome ? f.awayTeamId : f.homeTeamId;
                const teamGoals = isHome ? f.resultHome : f.resultAway;
                const oppGoals = isHome ? f.resultAway : f.resultHome;
                const outcome =
                  teamGoals === null || oppGoals === null
                    ? null
                    : teamGoals > oppGoals
                    ? "W"
                    : teamGoals < oppGoals
                    ? "L"
                    : "D";
                const outcomeClass =
                  outcome === "W"
                    ? "bg-success/20 text-success"
                    : outcome === "L"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-muted/30 text-muted-foreground";

                return (
                  <div
                    key={f.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-3xl border border-border bg-surface px-4 py-3"
                  >
                    <span
                      className={`w-5 text-center text-[11px] font-black uppercase ${outcomeClass} rounded-md px-1 py-0.5`}
                    >
                      {outcome ?? "—"}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      {opponentTeamId ? (
                        <Link to="/team/$teamId" params={{ teamId: opponentTeamId }}>
                          <TeamCrest short={opponentShort} crestUrl={opponentCrest} size={28} />
                        </Link>
                      ) : (
                        <TeamCrest short={opponentShort} crestUrl={opponentCrest} size={28} />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{opponentShort}</p>
                        <p className="text-[10px] text-muted-foreground">{isHome ? "Home" : "Away"}</p>
                      </div>
                    </div>
                    <span className="font-display text-lg tabular-nums">
                      {teamGoals ?? "—"}–{oppGoals ?? "—"}
                    </span>
                    <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                      {kickoffFmt.format(new Date(f.kickoffAt))}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Next 5 fixtures ── */}
        {upcomingMatches.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-xl">Next {upcomingMatches.length} fixtures</h2>
            <div className="space-y-2">
              {upcomingMatches.map((f) => {
                const isHome = f.homeTeamId === team.id;
                const opponentShort = isHome ? f.awayShort : f.homeShort;
                const opponentCrest = isHome ? f.awayCrest : f.homeCrest;
                const opponentTeamId = isHome ? f.awayTeamId : f.homeTeamId;

                return (
                  <div
                    key={f.id}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-3xl border border-border bg-surface px-4 py-3"
                  >
                    <span className="rounded-md bg-muted/30 px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                      {isHome ? "H" : "A"}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      {opponentTeamId ? (
                        <Link to="/team/$teamId" params={{ teamId: opponentTeamId }}>
                          <TeamCrest short={opponentShort} crestUrl={opponentCrest} size={28} />
                        </Link>
                      ) : (
                        <TeamCrest short={opponentShort} crestUrl={opponentCrest} size={28} />
                      )}
                      <p className="truncate text-sm font-semibold">{opponentShort}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground" suppressHydrationWarning>
                      {kickoffFmt.format(new Date(f.kickoffAt))}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {recentMatches.length === 0 && upcomingMatches.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-8 text-center text-sm text-muted-foreground">
            No fixture history yet. Sync fixtures in the super admin to populate match data.
          </div>
        )}

        {/* ── Squad ── */}
        {squad.length > 0 ? (
          <section>
            <h2 className="mb-2 font-display text-xl">Squad</h2>
            <div className="overflow-hidden rounded-3xl border border-border bg-surface">
              {positionGroups.map(({ label, key }, gi) => {
                const players = squad.filter((p) => p.position === key);
                if (!players.length) return null;
                return (
                  <div key={key}>
                    {gi > 0 && <div className="h-px bg-border" />}
                    <div className="px-4 py-2.5 bg-muted/20">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {label}
                      </p>
                    </div>
                    {players
                      .sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99))
                      .map((p, i) => (
                        <PlayerRow key={p.id} player={p} last={i === players.length - 1} />
                      ))}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          team.syncedAt && (
            <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-6 text-center text-sm text-muted-foreground">
              Squad data not available — may require a higher API plan tier.
            </div>
          )
        )}

        {/* Synced at */}
        {team.syncedAt && (
          <p className="text-center text-[10px] text-muted-foreground/50">
            Team data synced {dateFmt.format(new Date(team.syncedAt))}
          </p>
        )}
      </div>
    </AppShell>
  );
}

function StandingCard({ standing }: { standing: { competition: string; position: number; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number; form: string | null } }) {
  const formItems = standing.form
    ? standing.form.split(",").filter(Boolean)
    : [];

  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {standing.competition}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-4xl text-primary leading-none">#{standing.position}</span>
          <span className="text-xs text-muted-foreground">{standing.points} pts</span>
        </div>
      </div>

      {/* W/D/L stats */}
      <div className="grid grid-cols-4 gap-2 text-center mb-3">
        {[
          { label: "P", value: standing.played },
          { label: "W", value: standing.won, color: "text-success" },
          { label: "D", value: standing.drawn },
          { label: "L", value: standing.lost, color: "text-destructive" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl bg-background/60 py-2">
            <p className={`font-display text-xl leading-none ${color ?? ""}`}>{value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Goals */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        {[
          { label: "GF", value: standing.goalsFor },
          { label: "GA", value: standing.goalsAgainst },
          { label: "GD", value: standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl bg-background/60 py-2">
            <p className="font-display text-xl leading-none">{value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {formItems.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mr-1">
            Form
          </span>
          {formItems.slice(-5).map((r, i) => (
            <span
              key={i}
              className={[
                "h-6 w-6 rounded-full text-[10px] font-black grid place-items-center",
                r === "W" ? "bg-success text-success-foreground" : r === "L" ? "bg-destructive text-destructive-foreground" : "bg-muted/40 text-muted-foreground",
              ].join(" ")}
            >
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerRow({ player, last }: { player: SquadMember; last: boolean }) {
  return (
    <div
      className={[
        "flex items-center gap-3 px-4 py-2.5",
        !last ? "border-b border-border" : "",
      ].join(" ")}
    >
      <span className="w-7 text-center font-display text-sm text-muted-foreground">
        {player.shirtNumber != null ? player.shirtNumber : "—"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{player.name}</p>
      </div>
      {player.nationality && (
        <span className="shrink-0 text-[11px] text-muted-foreground">{player.nationality}</span>
      )}
    </div>
  );
}
