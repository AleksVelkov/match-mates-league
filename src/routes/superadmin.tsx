import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ScreenHeader } from "@/components/AppShell";
import {
  getSuperAdminStats,
  getAllGroups,
  getAllUsers,
  getEnabledCompetitions,
  setEnabledCompetitions,
} from "@/api/superadmin";
import { COMPETITION_CODES } from "@/lib/football-data";
import { Users, Trophy, Target, Database, Crown, Check } from "lucide-react";

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
    const [stats, allGroups, allUsers, enabledCompetitions] = await Promise.all([
      getSuperAdminStats(),
      getAllGroups(),
      getAllUsers(),
      getEnabledCompetitions(),
    ]);
    return { stats, allGroups, allUsers, enabledCompetitions };
  },
  component: SuperAdminPage,
});

const ALL_COMPETITIONS = Object.keys(COMPETITION_CODES);

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function SuperAdminPage() {
  const { stats, allGroups, allUsers, enabledCompetitions: initial } = Route.useLoaderData();
  const [tab, setTab] = useState<"overview" | "groups" | "users" | "competitions">("overview");
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
      <div className="flex gap-1 overflow-x-auto px-5 pb-4 no-scrollbar">
        {(["overview", "groups", "users", "competitions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition-all",
              tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
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
              <StatCard icon={<Users className="h-5 w-5" />} label="Total users" value={stats.users} />
              <StatCard icon={<Trophy className="h-5 w-5" />} label="Groups" value={stats.groups} />
              <StatCard icon={<Database className="h-5 w-5" />} label="Fixtures" value={stats.fixtures} />
              <StatCard icon={<Target className="h-5 w-5" />} label="Predictions" value={stats.predictions} />
            </div>

            {/* Recent groups */}
            <h3 className="pt-2 font-display text-xl">Recent groups</h3>
            <ul className="overflow-hidden rounded-3xl border border-border bg-surface">
              {allGroups.slice(0, 5).map((g, i) => (
                <li key={g.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
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
                <li key={u.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
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
              {saved ? <><Check className="h-5 w-5" /> Saved</> : saving ? "Saving…" : "Save changes"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}
        <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-2 font-display text-4xl leading-none text-primary">{value}</div>
    </div>
  );
}
