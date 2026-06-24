import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { TeamCrest } from "@/components/TeamCrest";
import { currentGroup, fixtures as initialFixtures, formatCountdown, members, suggestedScores, type Fixture } from "@/lib/mock-data";
import { ChevronLeft, ChevronRight, EyeOff, Minus, Plus, Star, Users } from "lucide-react";

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
  const [index, setIndex] = useState(0);
  const fixture = fixtures[index];

  const submitted = fixtures.filter((f) => f.predictionHome !== null).length;

  const update = (delta: Partial<Fixture>) => {
    setFixtures((arr) => arr.map((f, i) => (i === index ? { ...f, ...delta } : f)));
  };

  const setScore = (h: number, a: number) =>
    update({ predictionHome: Math.max(0, h), predictionAway: Math.max(0, a) });

  const toggleJoker = () => {
    setFixtures((arr) =>
      arr.map((f, i) => ({
        ...f,
        isJoker: i === index ? !f.isJoker : false,
      })),
    );
  };

  const go = (dir: -1 | 1) => {
    setIndex((i) => Math.max(0, Math.min(fixtures.length - 1, i + dir)));
  };

  const h = fixture.predictionHome ?? 0;
  const a = fixture.predictionAway ?? 0;
  const filled = fixture.predictionHome !== null;

  // simulate hidden predictions for this fixture
  const hidden = useMemo(() => {
    const count = Math.min(members.length, 8 + (index % 3));
    return count;
  }, [index]);

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
              <span className="text-muted-foreground">/{fixtures.length}</span>
            </div>
          </div>
        }
      />

      {/* Fixture dot indicator */}
      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto px-5">
        {fixtures.map((f, i) => (
          <button
            key={f.id}
            onClick={() => setIndex(i)}
            className={[
              "h-2 shrink-0 rounded-full transition-all",
              i === index
                ? "w-8 bg-primary"
                : f.predictionHome !== null
                  ? "w-2 bg-primary/60"
                  : "w-2 bg-border",
            ].join(" ")}
            aria-label={`Fixture ${i + 1}`}
          />
        ))}
      </div>

      {/* Fixture card */}
      <section className="px-5">
        <article
          className={[
            "relative overflow-hidden rounded-3xl border p-5 shadow-card transition-colors",
            fixture.isJoker
              ? "border-joker/60 bg-gradient-to-br from-joker/15 to-surface"
              : "border-border bg-surface",
          ].join(" ")}
        >
          {fixture.isJoker && (
            <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-joker px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-joker-foreground">
              <Star className="h-3 w-3 fill-current" /> Joker · ×2
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Kickoff in</span>
            <span className="font-display text-base text-foreground">
              {formatCountdown(fixture.kickoff)}
            </span>
          </div>

          {/* Teams */}
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <TeamColumn name={fixture.home} short={fixture.homeShort} value={h} onChange={(v) => setScore(v, a)} disabled={false} />
            <div className="grid place-items-center">
              <span className="font-display text-3xl text-muted-foreground">vs</span>
            </div>
            <TeamColumn name={fixture.away} short={fixture.awayShort} value={a} onChange={(v) => setScore(h, v)} disabled={false} reverse />
          </div>

          {/* Big score */}
          <div className="mt-6 grid place-items-center">
            <div className="flex items-center gap-6 font-display text-7xl leading-none">
              <span className={filled ? "text-foreground" : "text-muted-foreground/40"}>{h}</span>
              <span className="text-muted-foreground/40">:</span>
              <span className={filled ? "text-foreground" : "text-muted-foreground/40"}>{a}</span>
            </div>
          </div>

          {/* Suggested scores */}
          <div className="mt-6">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Quick pick
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {suggestedScores.map(([sh, sa]) => {
                const active = sh === h && sa === a;
                return (
                  <button
                    key={`${sh}-${sa}`}
                    onClick={() => setScore(sh, sa)}
                    className={[
                      "rounded-xl py-2 font-display text-base transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-background/50 text-foreground hover:bg-background",
                    ].join(" ")}
                  >
                    {sh}-{sa}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 grid grid-cols-[auto_1fr] gap-2">
            <button
              onClick={toggleJoker}
              className={[
                "flex items-center justify-center gap-1.5 rounded-2xl border px-4 py-3 font-display text-sm uppercase tracking-wider transition-all",
                fixture.isJoker
                  ? "border-joker bg-joker text-joker-foreground"
                  : "border-border bg-background/50 text-foreground",
              ].join(" ")}
            >
              <Star className={["h-4 w-4", fixture.isJoker ? "fill-current" : ""].join(" ")} />
              Joker
            </button>
            <button
              onClick={() => go(1)}
              className="rounded-2xl bg-primary py-3 font-display text-base uppercase tracking-wider text-primary-foreground shadow-glow"
            >
              Save & Next
            </button>
          </div>
        </article>

        {/* Hidden predictions */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <EyeOff className="h-4 w-4" />
            Hidden until kickoff
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-display text-base text-foreground">{hidden}</span>
            <span className="text-muted-foreground">submitted</span>
          </div>
        </div>

        {/* Swipe arrows */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            className="flex items-center justify-center gap-1 rounded-2xl border border-border bg-surface py-3 text-sm font-semibold disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <button
            onClick={() => go(1)}
            disabled={index === fixtures.length - 1}
            className="flex items-center justify-center gap-1 rounded-2xl border border-border bg-surface py-3 text-sm font-semibold disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </AppShell>
  );
}

function TeamColumn({
  name,
  short,
  value,
  onChange,
  disabled,
  reverse,
}: {
  name: string;
  short: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  reverse?: boolean;
}) {
  return (
    <div className={["flex flex-col items-center gap-2", reverse ? "" : ""].join(" ")}>
      <TeamCrest short={short} size={56} />
      <p className="text-center text-xs font-semibold leading-tight">{name}</p>
      <div className="mt-1 flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={disabled}
          className="grid h-9 w-9 place-items-center rounded-full bg-background text-foreground active:scale-95"
          aria-label={`Decrease ${name}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={() => onChange(value + 1)}
          disabled={disabled}
          className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow active:scale-95"
          aria-label={`Increase ${name}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
