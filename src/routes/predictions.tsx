import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { TeamCrest } from "@/components/TeamCrest";
import {
  currentGroup,
  fixtures as initialFixtures,
  type Fixture,
} from "@/lib/mock-data";
import { Star } from "lucide-react";

export const Route = createFileRoute("/predictions")({
  head: () => ({
    meta: [
      { title: "Pitch — Predictions" },
      { name: "description", content: "Predict every fixture in this round." },
    ],
  }),
  component: PredictionsPage,
});

function PredictionsPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>(initialFixtures);

  const submitted = fixtures.filter((f) => f.predictionHome !== null).length;
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
  };

  const toggleJoker = (id: string) => {
    setFixtures((arr) =>
      arr.map((f) => ({ ...f, isJoker: f.id === id ? !f.isJoker : false })),
    );
  };

  return (
    <AppShell>
      <ScreenHeader
        eyebrow={`${currentGroup.competition} · Round ${currentGroup.round}`}
        title="Predict"
      />

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
              style={{ width: `${(submitted / total) * 100}%` }}
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
        <button className="w-full rounded-2xl bg-primary py-4 font-display text-base uppercase tracking-wider text-primary-foreground shadow-glow">
          Submit round
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Predictions stay hidden from your group until each kickoff.
        </p>
      </div>
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
  fixture: Fixture;
  onScore: (side: "home" | "away", v: string) => void;
  onJoker: () => void;
}) {
  return (
    <article
      className={[
        "overflow-hidden rounded-3xl border transition-colors",
        fixture.isJoker
          ? "border-joker/60 bg-gradient-to-br from-joker/15 to-surface"
          : "border-border bg-surface",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="font-display text-sm text-foreground">
          {formatKickoff(fixture.kickoff)}
        </span>
        <button
          onClick={onJoker}
          className={[
            "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-all",
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
            onChange={(v) => onScore("home", v)}
            label={`${fixture.homeShort} score`}
          />
          <span className="font-display text-2xl text-muted-foreground/60">:</span>
          <ScoreInput
            value={fixture.predictionAway}
            onChange={(v) => onScore("away", v)}
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
  label,
}: {
  value: number | null;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
      placeholder="–"
      className={[
        "h-12 w-12 rounded-xl border border-border bg-background text-center font-display text-2xl leading-none text-foreground",
        "outline-none focus:border-primary focus:ring-2 focus:ring-primary/40",
        "placeholder:text-muted-foreground/40",
      ].join(" ")}
    />
  );
}
