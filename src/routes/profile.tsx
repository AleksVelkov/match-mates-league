import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { achievements, currentGroup, me } from "@/lib/mock-data";
import { Copy, Flame, Settings, Share2, Target, Trophy } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Pitch — Profile" },
      { name: "description", content: "Your streaks, achievements, and group invites." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AppShell>
      <ScreenHeader
        title="Profile"
        right={
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface">
            <Settings className="h-4 w-4" />
          </button>
        }
      />

      {/* Identity */}
      <section className="px-5">
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl text-primary-foreground shadow-glow">
            {me.avatar}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-3xl leading-none">{me.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentGroup.emoji} {currentGroup.name}
            </p>
          </div>
        </div>
      </section>

      {/* Stat grid */}
      <section className="mt-4 grid grid-cols-3 gap-2 px-5">
        <Stat icon={<Trophy className="h-3.5 w-3.5" />} label="Season" value={me.points} />
        <Stat icon={<Flame className="h-3.5 w-3.5" />} label="Streak" value={me.streak} accent />
        <Stat icon={<Target className="h-3.5 w-3.5" />} label="Exact" value={me.exact} />
      </section>

      {/* Streaks */}
      <section className="mt-6 px-5">
        <h3 className="mb-3 font-display text-xl">Active streaks</h3>
        <div className="grid grid-cols-1 gap-2">
          <StreakRow emoji="🔥" label="Correct winners in a row" value="7" />
          <StreakRow emoji="🎯" label="Exact scores this season" value="14" />
          <StreakRow emoji="⭐" label="Successful Jokers" value="3" />
        </div>
      </section>

      {/* Achievements */}
      <section className="mt-6 px-5">
        <h3 className="mb-3 font-display text-xl">Achievements</h3>
        <div className="grid grid-cols-2 gap-2">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={[
                "rounded-2xl border p-3 transition-all",
                a.unlocked
                  ? "border-primary/40 bg-gradient-to-br from-primary/15 to-surface"
                  : "border-border bg-surface opacity-50",
              ].join(" ")}
            >
              <div className="text-2xl">{a.icon}</div>
              <div className="mt-1 text-sm font-semibold leading-tight">{a.name}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground leading-tight">{a.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Group invite */}
      <section className="mt-6 px-5">
        <h3 className="mb-3 font-display text-xl">Invite friends</h3>
        <div className="rounded-3xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Invite code</p>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <code className="truncate rounded-xl bg-background/60 px-3 py-2.5 font-mono text-base">
              pitch.app/join/{currentGroup.inviteCode}
            </code>
            <button className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background/50 py-3 font-display text-sm uppercase tracking-wider">
            <Share2 className="h-4 w-4" /> Share invite link
          </button>
        </div>
      </section>
    </AppShell>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
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

function StreakRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
      <span className="text-2xl">{emoji}</span>
      <span className="truncate text-sm">{label}</span>
      <span className="font-display text-2xl text-joker">{value}</span>
    </div>
  );
}
