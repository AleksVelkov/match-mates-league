import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { TeamCrest } from "@/components/TeamCrest";
import { Countdown } from "@/components/Countdown";
import {
  currentGroup,
  fixtures as initialFixtures,
  suggestedScores,
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

  const setScore = (id: string, h: number, a: number) => {
    setFixtures((arr) =>
      arr.map((f) =>
        f.id === id
          ? { ...f, predictionHome: Math.max(0, h), predictionAway: Math.max(0, a) }
          : f,
      ),
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
        right={
          <div className="rounded-xl bg-surface px-3 py-1.5 text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Done</div>
            <div className="font-display text-xl leading-none">
              <span className="text-primary">{submitted}</span>
              <span className="text-muted-foreground">/{total}</span>
            </div>
          </div>
        }
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
            onScore={(h, a) => setScore(f.id, h, a)}
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

function FixtureRow({
  fixture,
  onScore,
  onJoker,
}: {
  fixture: Fixture;
  onScore: (h: number, a: number) => void;
  onJoker: () => void;
}) {
  const h = fixture.predictionHome ?? 0;
  const a = fixture.predictionAway ?? 0;
  const filled = fixture.predictionHome !== null;

  return (
    <article
      className={[
        "overflow-hidden rounded-3xl border transition-colors",
        fixture.isJoker
          ? "border-joker/60 bg-gradient-to-br from-joker/15 to-surface"
          : "border-border bg-surface",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-4 pt-3 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Countdown iso={fixture.kickoff} className="font-display text-sm normal-case tracking-normal text-foreground" />
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

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-3 pt-2">
        {/* Home */}
        <div className="flex items-center gap-2 min-w-0">
          <TeamCrest short={fixture.homeShort} size={36} />
          <p className="truncate text-sm font-semibold">{fixture.homeShort}</p>
        </div>

        {/* Score steppers */}
        <div className="flex items-center gap-1.5">
          <Stepper value={h} onChange={(v) => onScore(v, a)} />
          <span className="font-display text-2xl text-muted-foreground/60">:</span>
          <Stepper value={a} onChange={(v) => onScore(h, v)} />
        </div>

        {/* Away */}
        <div className="flex items-center justify-end gap-2 min-w-0">
          <p className="truncate text-right text-sm font-semibold">{fixture.awayShort}</p>
          <TeamCrest short={fixture.awayShort} size={36} />
        </div>
      </div>

      {/* Quick pick */}
      <div className="border-t border-border/60 bg-background/30 px-4 py-2.5">
        <div className="grid grid-cols-6 gap-1.5">
          {suggestedScores.map(([sh, sa]) => {
            const active = filled && sh === h && sa === a;
            return (
              <button
                key={`${sh}-${sa}`}
                onClick={() => onScore(sh, sa)}
                className={[
                  "rounded-lg py-1.5 font-display text-sm transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-surface text-foreground hover:bg-surface-2",
                ].join(" ")}
              >
                {sh}-{sa}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="grid h-7 w-7 place-items-center rounded-full bg-background text-foreground active:scale-95"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="w-7 text-center font-display text-2xl leading-none">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow active:scale-95"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}
