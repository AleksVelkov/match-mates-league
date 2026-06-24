import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { NoGroup } from "@/components/NoGroup";
import { TeamCrest } from "@/components/TeamCrest";
import { getMyGroups } from "@/api/groups";
import { getFixtures } from "@/api/fixtures";
import { getMyPredictions, savePredictions } from "@/api/predictions";
import { Check, Star } from "lucide-react";

export const Route = createFileRoute("/_protected/predictions")({
  head: () => ({
    meta: [
      { title: "ScorIQ — Predictions" },
      { name: "description", content: "Predict every fixture in this round." },
    ],
  }),
  loader: async () => {
    const groups = await getMyGroups();
    if (!groups.length) return { group: null, fixtures: [], myPreds: [] };
    const group = groups[0];
    const [fixtures, myPreds] = await Promise.all([
      getFixtures({ data: { groupId: group.id, round: group.round } }),
      getMyPredictions({ data: { groupId: group.id, round: group.round } }),
    ]);
    return { group, fixtures, myPreds };
  },
  component: PredictionsPage,
});

type Row = {
  id: string;
  homeShort: string;
  awayShort: string;
  kickoff: string;
  status: "upcoming" | "live" | "finished";
  predictionHome: number | null;
  predictionAway: number | null;
  isJoker: boolean;
  locked: boolean;
};

function PredictionsPage() {
  const data = Route.useLoaderData();
  const router = useRouter();

  if (!data.group) {
    return (
      <AppShell>
        <ScreenHeader eyebrow="Predictions" title="Predict" />
        <NoGroup />
      </AppShell>
    );
  }

  return <PredictionsView group={data.group} fixtures={data.fixtures} myPreds={data.myPreds} router={router} />;
}

function PredictionsView({
  group,
  fixtures: rawFixtures,
  myPreds,
  router,
}: {
  group: { id: string; name: string; competition: string; round: number };
  fixtures: Array<{
    id: string;
    homeShort: string;
    awayShort: string;
    kickoffAt: string | Date;
    status: "upcoming" | "live" | "finished";
  }>;
  myPreds: Array<{ fixtureId: string; scoreHome: number | null; scoreAway: number | null; isJoker: boolean }>;
  router: ReturnType<typeof useRouter>;
}) {
  const now = Date.now();
  const predMap = useMemo(
    () => new Map(myPreds.map((p) => [p.fixtureId, p])),
    [myPreds],
  );

  const initial: Row[] = useMemo(
    () =>
      [...rawFixtures]
        .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
        .map((f) => {
          const p = predMap.get(f.id);
          const kickoff = new Date(f.kickoffAt).toISOString();
          return {
            id: f.id,
            homeShort: f.homeShort,
            awayShort: f.awayShort,
            kickoff,
            status: f.status,
            predictionHome: p?.scoreHome ?? null,
            predictionAway: p?.scoreAway ?? null,
            isJoker: p?.isJoker ?? false,
            locked: new Date(kickoff).getTime() <= now,
          };
        }),
    [rawFixtures, predMap, now],
  );

  const [fixtures, setFixtures] = useState<Row[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitted = fixtures.filter((f) => f.predictionHome !== null && f.predictionAway !== null).length;
  const total = fixtures.length;
  const jokerId = useMemo(() => fixtures.find((f) => f.isJoker)?.id ?? null, [fixtures]);

  const setScore = (id: string, side: "home" | "away", raw: string) => {
    const n = raw === "" ? null : Math.max(0, Math.min(99, parseInt(raw, 10) || 0));
    setFixtures((arr) =>
      arr.map((f) => {
        if (f.id !== id) return f;
        if (side === "home") return { ...f, predictionHome: n };
        return { ...f, predictionAway: n };
      }),
    );
    setSaved(false);
  };

  const toggleJoker = (id: string) => {
    setFixtures((arr) =>
      arr.map((f) => ({ ...f, isJoker: f.id === id ? !f.isJoker : false })),
    );
    setSaved(false);
  };

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = fixtures
        .filter((f) => !f.locked && (f.predictionHome !== null || f.predictionAway !== null || f.isJoker))
        .map((f) => ({
          fixtureId: f.id,
          scoreHome: f.predictionHome,
          scoreAway: f.predictionAway,
          isJoker: f.isJoker,
        }));
      await savePredictions({ data: { groupId: group.id, round: group.round, predictions: payload } });
      setSaved(true);
      router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save predictions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <ScreenHeader
        eyebrow={`${group.competition} · Round ${group.round}`}
        title="Predict"
      />

      {total === 0 ? (
        <section className="px-5 pt-2">
          <div className="rounded-3xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No fixtures for this round yet. The group owner can sync them from the Admin tab.
          </div>
        </section>
      ) : (
        <>
          {/* Round progress + joker status */}
          <section className="px-5">
            <div className="rounded-3xl border border-border bg-surface p-4">
              <div className="mb-2 flex items-end justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Round progress
                </span>
                <span className="font-display text-lg">
                  <span className="text-primary">{submitted}</span>
                  <span className="text-muted-foreground">/{total}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background/60">
                <div
                  className="h-full rounded-full bg-primary shadow-glow transition-all"
                  style={{ width: `${total ? (submitted / total) * 100 : 0}%` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Star className={`h-3.5 w-3.5 ${jokerId ? "fill-joker text-joker" : ""}`} />
                {jokerId
                  ? "Joker locked in — that match scores ×2."
                  : "Pick one Joker match to double your points."}
              </div>
            </div>
          </section>

          {/* All fixtures for the round */}
          <section className="mt-5 space-y-3 px-5">
            {fixtures.map((f) => (
              <FixtureRow
                key={f.id}
                fixture={f}
                onScore={(side, v) => setScore(f.id, side, v)}
                onJoker={() => toggleJoker(f.id)}
              />
            ))}
          </section>

          <div className="px-5 pt-5">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-base uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {saved ? <><Check className="h-5 w-5" /> Saved</> : saving ? "Saving…" : "Submit round"}
            </button>
            {error && <p className="mt-2 text-center text-[11px] text-destructive">{error}</p>}
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Predictions stay hidden from your group until each kickoff.
            </p>
          </div>
        </>
      )}
    </AppShell>
  );
}

const kickoffFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatKickoff(iso: string) {
  return kickoffFormatter.format(new Date(iso));
}

function FixtureRow({
  fixture,
  onScore,
  onJoker,
}: {
  fixture: Row;
  onScore: (side: "home" | "away", v: string) => void;
  onJoker: () => void;
}) {
  const isComplete =
    fixture.predictionHome !== null && fixture.predictionAway !== null;
  const [editingSide, setEditingSide] = useState<"home" | "away" | null>(null);

  return (
    <article
      className={[
        "overflow-hidden rounded-3xl border transition-colors",
        isComplete && !editingSide ? "opacity-60" : "",
        fixture.isJoker
          ? "border-joker/60 bg-gradient-to-br from-joker/15 to-surface"
          : "border-border bg-surface",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <span
          className="font-display text-sm text-foreground"
          suppressHydrationWarning
        >
          {formatKickoff(fixture.kickoff)}
          {fixture.locked && <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">Locked</span>}
        </span>
        <button
          onClick={onJoker}
          disabled={fixture.locked}
          className={[
            "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50",
            fixture.isJoker
              ? "border-joker bg-joker text-joker-foreground"
              : "border-border text-muted-foreground",
          ].join(" ")}
        >
          <Star className={`h-3 w-3 ${fixture.isJoker ? "fill-current" : ""}`} />
          Joker {fixture.isJoker ? "×2" : ""}
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-4 pt-3">
        {/* Home */}
        <div className="flex items-center gap-2 min-w-0">
          <TeamCrest short={fixture.homeShort} size={36} />
          <p className="truncate text-sm font-semibold">{fixture.homeShort}</p>
        </div>

        {/* Score boxes */}
        <div className="flex items-center gap-2">
          <ScoreInput
            value={fixture.predictionHome}
            disabled={fixture.locked}
            onChange={(v) => onScore("home", v)}
            onFocus={() => setEditingSide("home")}
            onBlur={() => setEditingSide((s) => (s === "home" ? null : s))}
            label={`${fixture.homeShort} score`}
          />
          <span className="font-display text-2xl text-muted-foreground/60">:</span>
          <ScoreInput
            value={fixture.predictionAway}
            disabled={fixture.locked}
            onChange={(v) => onScore("away", v)}
            onFocus={() => setEditingSide("away")}
            onBlur={() => setEditingSide((s) => (s === "away" ? null : s))}
            label={`${fixture.awayShort} score`}
          />
        </div>

        {/* Away */}
        <div className="flex items-center justify-end gap-2 min-w-0">
          <p className="truncate text-right text-sm font-semibold">{fixture.awayShort}</p>
          <TeamCrest short={fixture.awayShort} size={36} />
        </div>
      </div>
    </article>
  );
}

function ScoreInput({
  value,
  onChange,
  onFocus,
  onBlur,
  label,
  disabled,
}: {
  value: number | null;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  label: string;
  disabled?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/g, "");
    onChange(v);
    setSaved(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        aria-label={label}
        value={value ?? ""}
        disabled={disabled}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="–"
        className={[
          "h-12 w-12 rounded-xl border border-border bg-background text-center font-display text-2xl leading-none text-foreground",
          "outline-none focus:border-primary focus:ring-2 focus:ring-primary/40",
          "placeholder:text-muted-foreground/40 disabled:opacity-50",
        ].join(" ")}
      />
      {saved && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground shadow-sm">
          <Check className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
