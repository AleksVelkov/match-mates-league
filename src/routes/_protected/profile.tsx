import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { useTheme } from "@/components/ThemeToggle";
import { getMe, signOut } from "@/api/auth";
import { getMyGroups } from "@/api/groups";
import { getLeaderboard } from "@/api/leaderboard";
import { Check, Copy, Flame, LogOut, Moon, Share2, Sun, Target, Trophy, Users } from "lucide-react";

export const Route = createFileRoute("/_protected/profile")({
  head: () => ({
    meta: [
      { title: "ScorIQ — Profile" },
      { name: "description", content: "Your streaks, achievements, and group invites." },
    ],
  }),
  loader: async () => {
    const [me, groups] = await Promise.all([getMe(), getMyGroups()]);
    if (!groups.length) return { me, group: null, stats: null };
    const group = groups[0];
    const standings = await getLeaderboard({ data: { groupId: group.id } });
    const stats = standings.find((s) => s.isMe) ?? null;
    return { me, group, stats };
  },
  component: ProfilePage,
});

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

const ACHIEVEMENTS: Array<{
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: (s: { points: number; exact: number; streak: number }) => boolean;
}> = [
  { id: "a1", name: "First Exact Score", description: "Nail one on the head.", icon: "🎯", unlocked: (s) => s.exact >= 1 },
  { id: "a2", name: "10 Exact Scores", description: "You see the future.", icon: "🔮", unlocked: (s) => s.exact >= 10 },
  { id: "a3", name: "25 Exact Scores", description: "Certified clairvoyant.", icon: "🧿", unlocked: (s) => s.exact >= 25 },
  { id: "a6", name: "Unstoppable", description: "10 correct outcomes in a row.", icon: "⚡", unlocked: (s) => s.streak >= 10 },
  { id: "a7", name: "Prediction Legend", description: "Reach 1000 total points.", icon: "👑", unlocked: (s) => s.points >= 1000 },
  { id: "a4", name: "Century", description: "Reach 100 total points.", icon: "💯", unlocked: (s) => s.points >= 100 },
];

function ProfilePage() {
  const { me, group, stats } = Route.useLoaderData();
  const router = useRouter();
  const { theme, toggle, mounted } = useTheme();
  const name = me?.name ?? "You";
  const points = stats?.points ?? 0;
  const streak = stats?.streak ?? 0;
  const exact = stats?.exact ?? 0;
  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function copyInvite() {
    if (!group) return;
    navigator.clipboard?.writeText(group.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      await router.navigate({ to: "/login" });
      router.invalidate();
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <AppShell>
      <ScreenHeader title="Profile" />

      {/* Identity — always shown */}
      <section className="px-5">
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl text-primary-foreground shadow-glow">
            {initials(name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-3xl leading-none">{name}</h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {group ? `${group.emoji} ${group.name}` : me?.email}
            </p>
          </div>
        </div>
      </section>

      {/* Settings — always shown */}
      <section className="mt-4 px-5">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface">
          <button
            onClick={toggle}
            className="flex w-full items-center justify-between border-b border-border px-4 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              {mounted && theme === "dark" ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm font-semibold">Appearance</span>
            </div>
            <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              {mounted ? (theme === "dark" ? "Dark" : "Light") : ""}
              <span
                className={[
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                  theme === "light" ? "bg-primary" : "bg-muted/40",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                    theme === "light" ? "translate-x-[22px]" : "translate-x-0.5",
                  ].join(" ")}
                />
              </span>
            </span>
          </button>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-semibold text-destructive disabled:opacity-60"
          >
            <LogOut className="h-5 w-5" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </section>

      {!group ? (
        <section className="mt-4 px-5">
          <div className="rounded-3xl border border-border bg-surface p-5 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              You're not in a group yet. Join or create one to start tracking stats and achievements.
            </p>
            <Link
              to="/admin"
              className="mt-4 inline-grid w-full place-items-center rounded-2xl bg-primary py-3 font-display text-base uppercase tracking-wider text-primary-foreground shadow-glow"
            >
              Go to Admin
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Stat grid */}
          <section className="mt-4 grid grid-cols-3 gap-2 px-5">
            <Stat icon={<Trophy className="h-3.5 w-3.5" />} label="Season" value={points} />
            <Stat icon={<Flame className="h-3.5 w-3.5" />} label="Streak" value={streak} accent />
            <Stat icon={<Target className="h-3.5 w-3.5" />} label="Exact" value={exact} />
          </section>

          {/* Streaks */}
          <section className="mt-6 px-5">
            <h3 className="mb-3 font-display text-xl">This season</h3>
            <div className="grid grid-cols-1 gap-2">
              <StreakRow emoji="🔥" label="Correct outcomes in a row" value={`${streak}`} />
              <StreakRow emoji="🎯" label="Exact scores this season" value={`${exact}`} />
              <StreakRow emoji="🏆" label="Total points" value={`${points}`} />
            </div>
          </section>

          {/* Achievements */}
          <section className="mt-6 px-5">
            <h3 className="mb-3 font-display text-xl">Achievements</h3>
            <div className="grid grid-cols-2 gap-2">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = a.unlocked({ points, exact, streak });
                return (
                  <div
                    key={a.id}
                    className={[
                      "rounded-2xl border p-3 transition-all",
                      unlocked
                        ? "border-primary/40 bg-gradient-to-br from-primary/15 to-surface"
                        : "border-border bg-surface opacity-50",
                    ].join(" ")}
                  >
                    <div className="text-2xl">{a.icon}</div>
                    <div className="mt-1 text-sm font-semibold leading-tight">{a.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground leading-tight">{a.description}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Group invite */}
          <section className="mt-6 px-5">
            <h3 className="mb-3 font-display text-xl">Invite friends</h3>
            <div className="rounded-3xl border border-border bg-surface p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Invite code</p>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <code className="truncate rounded-xl bg-background/60 px-3 py-2.5 font-mono text-base">
                  {group.inviteCode}
                </code>
                <button
                  onClick={copyInvite}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background/50 py-3 font-display text-sm uppercase tracking-wider text-muted-foreground">
                <Share2 className="h-4 w-4" /> Share this code with friends
              </p>
            </div>
          </section>
        </>
      )}
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
