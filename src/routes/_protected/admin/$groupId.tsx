import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { TeamCrest } from "@/components/TeamCrest";
import { getGroup } from "@/api/groups";
import { getFixtures, syncFixtures, submitResult } from "@/api/fixtures";
import { AlertTriangle, ChevronLeft, RefreshCw, Check } from "lucide-react";

export const Route = createFileRoute("/_protected/admin/$groupId")({
  head: () => ({ meta: [{ title: "ScorIQ — Manage Group" }] }),
  loader: async ({ params }) => {
    const group = await getGroup({ data: { groupId: params.groupId } });
    const fixtures = await getFixtures({ data: { groupId: params.groupId, round: group.round } });
    return { group, fixtures };
  },
  component: AdminGroupPage,
});

const kickoffFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short", day: "2-digit", month: "short",
  hour: "2-digit", minute: "2-digit", hour12: false,
});

function AdminGroupPage() {
  const { group: initialGroup, fixtures: initialFixtures } = Route.useLoaderData();
  const { me } = Route.useRouteContext();
  const isOwner = initialGroup.ownerId === me.id;

  const [group, setGroup] = useState(initialGroup);
  const [fixtures, setFixtures] = useState(initialFixtures);
  const [round, setRound] = useState(group.round);

  // Sync state
  const [matchday, setMatchday] = useState(group.round);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; new: number; quota: number | null; resetIn: number | null } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await syncFixtures({ data: { groupId: group.id, matchday } });
      setSyncResult({ synced: res.synced, new: res.new, quota: res.requestsRemainingThisMinute ?? null, resetIn: res.rateLimitResetsInSeconds ?? null });
      // Reload fixtures for the synced matchday
      const updated = await getFixtures({ data: { groupId: group.id, round: matchday } });
      setFixtures(updated);
      setRound(matchday);
      setGroup((g) => ({ ...g, round: matchday }));
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleRoundChange(r: number) {
    setRound(r);
    const updated = await getFixtures({ data: { groupId: group.id, round: r } });
    setFixtures(updated);
  }

  const rounds = Array.from(new Set([group.round, round, matchday])).filter(Boolean).sort((a, b) => a - b);

  return (
    <AppShell>
      <ScreenHeader
        eyebrow={`${group.competition} · Round ${group.round}`}
        title={`${group.emoji} ${group.name}`}
        right={
          <Link to="/admin" className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        }
      />

      {/* Sync panel — owner only */}
      {isOwner && (
        <section className="px-5 pb-4">
          <div className="rounded-3xl border border-border bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Sync from football-data.org
            </p>

            <div className="mt-3 flex items-center gap-3">
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

            {syncResult && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 rounded-xl bg-success/15 px-3 py-2 text-sm text-success">
                  <Check className="h-4 w-4 shrink-0" />
                  Synced {syncResult.synced} fixtures ({syncResult.new} new)
                </div>
                {syncResult.quota !== null && (
                  <div className={`rounded-xl px-3 py-2 text-xs ${syncResult.quota <= 2 ? "bg-destructive/15 text-destructive" : "bg-muted/30 text-muted-foreground"}`}>
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

            {syncError && (
              <p className="mt-3 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">
                {syncError}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Round selector */}
      {rounds.length > 1 && (
        <section className="flex gap-2 overflow-x-auto px-5 pb-4 no-scrollbar">
          {rounds.map((r) => (
            <button
              key={r}
              onClick={() => handleRoundChange(r)}
              className={[
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all",
                r === round
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground",
              ].join(" ")}
            >
              Round {r}
            </button>
          ))}
        </section>
      )}

      {/* Fixtures list */}
      <section className="space-y-3 px-5 pb-6">
        {fixtures.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {isOwner ? "No fixtures for this round — sync above" : "No fixtures for this round yet"}
            </p>
          </div>
        ) : (
          fixtures.map((f) => (
            <FixtureCard
              key={f.id}
              fixture={f}
              isOwner={isOwner}
              onResultSaved={(resultHome, resultAway) =>
                setFixtures((arr) =>
                  arr.map((x) =>
                    x.id === f.id ? { ...x, resultHome, resultAway, status: "finished" } : x
                  )
                )
              }
            />
          ))
        )}
      </section>
    </AppShell>
  );
}

type Fixture = Awaited<ReturnType<typeof getFixtures>>[number];

function FixtureCard({
  fixture: f,
  isOwner,
  onResultSaved,
}: {
  fixture: Fixture;
  isOwner: boolean;
  onResultSaved: (home: number, away: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [homeScore, setHomeScore] = useState(String(f.resultHome ?? ""));
  const [awayScore, setAwayScore] = useState(String(f.resultAway ?? ""));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasResult = f.resultHome !== null && f.resultAway !== null;
  const showResultForm = isOwner && (editing || !hasResult);

  async function handleSave() {
    const h = parseInt(homeScore, 10);
    const a = parseInt(awayScore, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setSaveError("Enter valid scores (0 or higher)");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await submitResult({ data: { fixtureId: f.id, resultHome: h, resultAway: a } });
      onResultSaved(h, a);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save result");
    } finally {
      setSaving(false);
    }
  }

  const statusColors: Record<string, string> = {
    upcoming: "bg-muted/30 text-muted-foreground",
    live: "bg-success/20 text-success",
    finished: "bg-primary/15 text-primary",
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[11px] text-muted-foreground" suppressHydrationWarning>
          {kickoffFmt.format(new Date(f.kickoffAt))}
        </span>
        <div className="flex items-center gap-2">
          {hasResult && !editing && (
            <span className="font-display text-lg text-foreground">
              {f.resultHome} – {f.resultAway}
            </span>
          )}
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusColors[f.status] ?? ""}`}>
            {f.status}
          </span>
          {isOwner && hasResult && !editing && (
            <button
              onClick={() => { setEditing(true); setHomeScore(String(f.resultHome)); setAwayScore(String(f.resultAway)); }}
              className="text-[11px] font-semibold uppercase tracking-widest text-primary"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <TeamCrest short={f.homeShort} size={36} />
          <p className="truncate text-sm font-semibold">{f.homeShort}</p>
        </div>
        <span className="font-display text-2xl text-muted-foreground/60">vs</span>
        <div className="flex items-center justify-end gap-2 min-w-0">
          <p className="truncate text-right text-sm font-semibold">{f.awayShort}</p>
          <TeamCrest short={f.awayShort} size={36} />
        </div>
      </div>

      {/* Result entry (owner only) */}
      {showResultForm && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Final score
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={99}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              placeholder="0"
              className="h-12 w-16 rounded-xl border border-border bg-background text-center font-display text-2xl outline-none focus:border-primary"
            />
            <span className="font-display text-2xl text-muted-foreground">–</span>
            <input
              type="number"
              min={0}
              max={99}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              placeholder="0"
              className="h-12 w-16 rounded-xl border border-border bg-background text-center font-display text-2xl outline-none focus:border-primary"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="ml-auto flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-display text-sm uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {saving ? "…" : <><Check className="h-4 w-4" /> Save</>}
            </button>
            {editing && (
              <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground">
                Cancel
              </button>
            )}
          </div>
          {saveError && (
            <p className="mt-2 text-xs text-destructive">{saveError}</p>
          )}
        </div>
      )}
    </article>
  );
}
