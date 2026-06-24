import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/AppShell";
import {
  getSuperAdminStats,
  getAllGroups,
  getAllUsers,
  getEnabledCompetitions,
  setEnabledCompetitions,
  getCurrentRounds,
  getCompetitionFixtures,
  syncCompetition,
  setMatchResult,
  setActiveRound,
} from "@/api/superadmin";
import { COMPETITION_CODES } from "@/lib/football-data";
import { Users, Trophy, Target, Database, Check, RefreshCw, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/superadmin")({
  head: () => ({ meta: [{ title: "ScorIQ — Super Admin" }] }),
  beforeLoad: async () => {
    try {
      await getSuperAdminStats();
    } catch {
      throw redirect({ to: "/" });
    }
  },
  loader: async () => {
    const [stats, allGroups, allUsers, enabledCompetitions, currentRounds] = await Promise.all([
      getSuperAdminStats(),
      getAllGroups(),
      getAllUsers(),
      getEnabledCompetitions(),
      getCurrentRounds(),
    ]);
    return { stats, allGroups, allUsers, enabledCompetitions, currentRounds };
  },
  component: SuperAdminPage,
});

const ALL_COMPETITIONS = Object.keys(COMPETITION_CODES);

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function SuperAdminPage() {
  const {
    stats,
    allGroups,
    allUsers,
    enabledCompetitions: initial,
    currentRounds,
  } = Route.useLoaderData();
  const [tab, setTab] = useState<"overview" | "matches" | "groups" | "users" | "competitions">(
    "overview",
  );
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initial));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSaveCompetitions() {
    setSaving(true);
    setSaved(false);
    try {
      await setEnabledCompetitions({ data: { competitions: [...enabled] } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function toggleCompetition(name: string) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setSaved(false);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background">
      <ScreenHeader eyebrow="Super Admin" title="Dashboard" />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 px-5 pb-4">
        {(["overview", "matches", "groups", "users", "competitions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition-all",
              tab === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 px-5 pb-10">
        {/* ── Overview ── */}
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Users className="h-5 w-5" />}
                label="Total users"
                value={stats.users}
              />
              <StatCard icon={<Trophy className="h-5 w-5" />} label="Groups" value={stats.groups} />
              <StatCard
                icon={<Database className="h-5 w-5" />}
                label="Fixtures"
                value={stats.fixtures}
              />
              <StatCard
                icon={<Target className="h-5 w-5" />}
                label="Predictions"
                value={stats.predictions}
              />
            </div>

            {/* Recent groups */}
            <h3 className="pt-2 font-display text-xl">Recent groups</h3>
            <ul className="overflow-hidden rounded-3xl border border-border bg-surface">
              {allGroups.slice(0, 5).map((g, i) => (
                <li
                  key={g.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <span className="text-xl">{g.emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{g.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{g.ownerEmail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{g.memberCount}m</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── Matches ── */}
        {tab === "matches" && (
          <MatchesTab enabledCompetitions={initial} currentRounds={currentRounds} />
        )}

        {/* ── Groups ── */}
        {tab === "groups" && (
          <>
            <p className="text-xs text-muted-foreground">{allGroups.length} groups total</p>
            <ul className="space-y-2">
              {allGroups.map((g) => (
                <li key={g.id} className="rounded-3xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{g.emoji}</span>
                        <span className="truncate font-display text-xl leading-none">{g.name}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {g.competition} · Round {g.round}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {g.memberCount} members
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
                    <div>
                      <span className="font-semibold text-foreground">Owner</span>
                      <p className="truncate">{g.ownerName}</p>
                      <p className="truncate">{g.ownerEmail}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-foreground">Stats</span>
                      <p>{g.fixtureCount} fixtures</p>
                      <p>Code: {g.inviteCode}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-right text-[10px] text-muted-foreground">
                    Created {g.createdAt ? dateFmt.format(new Date(g.createdAt)) : "—"}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── Users ── */}
        {tab === "users" && (
          <>
            <p className="text-xs text-muted-foreground">{allUsers.length} users total</p>
            <ul className="overflow-hidden rounded-3xl border border-border bg-surface">
              {allUsers.map((u) => (
                <li
                  key={u.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{u.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <p>{u.groupCount} groups</p>
                    <p>{u.predictionCount} pred.</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── Competitions ── */}
        {tab === "competitions" && (
          <>
            <p className="text-xs text-muted-foreground">
              Toggle which competitions appear in the "Create group" picker.
            </p>
            <ul className="overflow-hidden rounded-3xl border border-border bg-surface">
              {ALL_COMPETITIONS.map((name) => {
                const on = enabled.has(name);
                return (
                  <li
                    key={name}
                    className="flex items-center justify-between border-b border-border px-4 py-3.5 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-semibold">{name}</p>
                      <p className="text-[11px] text-muted-foreground">{COMPETITION_CODES[name]}</p>
                    </div>
                    <button
                      onClick={() => toggleCompetition(name)}
                      className={[
                        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                        on ? "bg-primary" : "bg-muted/40",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                          on ? "translate-x-[22px]" : "translate-x-0.5",
                        ].join(" ")}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              onClick={handleSaveCompetitions}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-display text-lg uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {saved ? (
                <>
                  <Check className="h-5 w-5" /> Saved
                </>
              ) : saving ? (
                "Saving…"
              ) : (
                "Save changes"
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

type CompFixture = Awaited<ReturnType<typeof getCompetitionFixtures>>[number];

const kickoffFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function MatchesTab({
  enabledCompetitions,
  currentRounds,
}: {
  enabledCompetitions: string[];
  currentRounds: Record<string, number>;
}) {
  const [competition, setCompetition] = useState(enabledCompetitions[0] ?? "");
  const [matchday, setMatchday] = useState(currentRounds[enabledCompetitions[0] ?? ""] ?? 1);
  const [fixtures, setFixtures] = useState<CompFixture[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    new: number;
    quota: number | null;
    resetIn: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRound, setActiveRoundState] = useState<number | undefined>(
    currentRounds[enabledCompetitions[0] ?? ""],
  );

  async function loadFixtures(comp: string, round: number) {
    if (!comp) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await getCompetitionFixtures({ data: { competition: comp, round } });
      setFixtures(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load fixtures");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFixtures(competition, matchday);
  }, [competition, matchday]);

  function handleCompetitionChange(comp: string) {
    setCompetition(comp);
    const r = currentRounds[comp] ?? 1;
    setMatchday(r);
    setActiveRoundState(currentRounds[comp]);
    setSyncResult(null);
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const res = await syncCompetition({ data: { competition, matchday } });
      setSyncResult({
        synced: res.synced,
        new: res.new,
        quota: res.requestsRemainingThisMinute ?? null,
        resetIn: res.rateLimitResetsInSeconds ?? null,
      });
      setActiveRoundState(matchday);
      await loadFixtures(competition, matchday);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSetActive() {
    setError(null);
    try {
      await setActiveRound({ data: { competition, round: matchday } });
      setActiveRoundState(matchday);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set active round");
    }
  }

  if (enabledCompetitions.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
        No leagues enabled yet. Enable some in the Competitions tab first.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-3xl border border-border bg-surface p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Sync matches from football-data.org
        </p>

        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">League</label>
            <select
              value={competition}
              onChange={(e) => handleCompetitionChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-primary"
            >
              {enabledCompetitions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Matchday</label>
              <input
                type="number"
                min={1}
                max={99}
                value={matchday}
                onChange={(e) => setMatchday(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-center font-display text-2xl outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-display text-sm uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync"}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-background/60 px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              Active round:{" "}
              <span className="font-semibold text-foreground">{activeRound ?? "—"}</span>
            </span>
            <button
              onClick={handleSetActive}
              disabled={activeRound === matchday}
              className="rounded-full border border-border px-3 py-1 font-semibold text-primary disabled:opacity-40"
            >
              Publish round {matchday}
            </button>
          </div>
        </div>

        {syncResult && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 rounded-xl bg-success/15 px-3 py-2 text-sm text-success">
              <Check className="h-4 w-4 shrink-0" />
              Synced {syncResult.synced} matches ({syncResult.new} new)
            </div>
            {syncResult.quota !== null && (
              <div
                className={`rounded-xl px-3 py-2 text-xs ${syncResult.quota <= 2 ? "bg-destructive/15 text-destructive" : "bg-muted/30 text-muted-foreground"}`}
              >
                {syncResult.quota <= 2 ? (
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Rate limit: {syncResult.quota} req/min remaining
                    {syncResult.resetIn ? ` — resets in ${syncResult.resetIn}s` : ""}
                  </span>
                ) : (
                  `${syncResult.quota} requests remaining this minute`
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {loading ? (
          <p className="px-1 text-xs text-muted-foreground">Loading…</p>
        ) : fixtures.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-8 text-center text-sm text-muted-foreground">
            No matches for this round yet — sync above.
          </div>
        ) : (
          fixtures.map((f) => (
            <MatchRow
              key={f.id}
              fixture={f}
              onResultSaved={(home, away) =>
                setFixtures((arr) =>
                  arr.map((x) =>
                    x.id === f.id
                      ? { ...x, resultHome: home, resultAway: away, status: "finished" }
                      : x,
                  ),
                )
              }
            />
          ))
        )}
      </div>
    </>
  );
}

function MatchRow({
  fixture: f,
  onResultSaved,
}: {
  fixture: CompFixture;
  onResultSaved: (home: number, away: number) => void;
}) {
  const hasResult = f.resultHome !== null && f.resultAway !== null;
  const [editing, setEditing] = useState(false);
  const [home, setHome] = useState(String(f.resultHome ?? ""));
  const [away, setAway] = useState(String(f.resultAway ?? ""));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    upcoming: "bg-muted/30 text-muted-foreground",
    live: "bg-success/20 text-success",
    finished: "bg-primary/15 text-primary",
  };

  async function save() {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setErr("Enter valid scores");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await setMatchResult({ data: { fixtureId: f.id, resultHome: h, resultAway: a } });
      onResultSaved(h, a);
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground" suppressHydrationWarning>
          {kickoffFmt.format(new Date(f.kickoffAt))}
        </span>
        <div className="flex items-center gap-2">
          {hasResult && !editing && (
            <span className="font-display text-lg">
              {f.resultHome} – {f.resultAway}
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusColors[f.status] ?? ""}`}
          >
            {f.status}
          </span>
          {hasResult && !editing && (
            <button
              onClick={() => {
                setEditing(true);
                setHome(String(f.resultHome));
                setAway(String(f.resultAway));
              }}
              className="text-[11px] font-semibold uppercase tracking-widest text-primary"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-sm font-semibold">
        <span className="truncate">{f.homeShort}</span>
        <span className="text-muted-foreground/60">vs</span>
        <span className="truncate text-right">{f.awayShort}</span>
      </div>

      {(editing || !hasResult) && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={99}
            value={home}
            onChange={(e) => setHome(e.target.value)}
            placeholder="0"
            className="h-11 w-14 rounded-xl border border-border bg-background text-center font-display text-xl outline-none focus:border-primary"
          />
          <span className="font-display text-xl text-muted-foreground">–</span>
          <input
            type="number"
            min={0}
            max={99}
            value={away}
            onChange={(e) => setAway(e.target.value)}
            placeholder="0"
            className="h-11 w-14 rounded-xl border border-border bg-background text-center font-display text-xl outline-none focus:border-primary"
          />
          <button
            onClick={save}
            disabled={saving}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-display text-sm uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {saving ? (
              "…"
            ) : (
              <>
                <Check className="h-4 w-4" /> Save
              </>
            )}
          </button>
          {editing && (
            <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground">
              Cancel
            </button>
          )}
        </div>
      )}
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </article>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-2 font-display text-4xl leading-none text-primary">{value}</div>
    </div>
  );
}
