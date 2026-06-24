import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { TeamCrest } from "@/components/TeamCrest";
import { getGroup, getMyGroups } from "@/api/groups";
import { getFixtures } from "@/api/fixtures";
import { getLeaderboard } from "@/api/leaderboard";
import { copyPredictionsToMyGroups } from "@/api/predictions";
import { ChevronLeft, Check, Copy, Users, Crown, Flame, CopyPlus } from "lucide-react";

export const Route = createFileRoute("/_protected/admin/$groupId")({
  head: () => ({ meta: [{ title: "ScorIQ — Manage Group" }] }),
  loader: async ({ params }) => {
    const group = await getGroup({ data: { groupId: params.groupId } });
    const [fixtures, standings, myGroups] = await Promise.all([
      getFixtures({ data: { groupId: params.groupId, round: group.round } }),
      getLeaderboard({ data: { groupId: params.groupId } }),
      getMyGroups(),
    ]);
    const siblingCount = myGroups.filter(
      (g) => g.competition === group.competition && g.id !== group.id,
    ).length;
    return { group, fixtures, standings, siblingCount };
  },
  component: AdminGroupPage,
});

const kickoffFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function AdminGroupPage() {
  const { group, fixtures, standings, siblingCount } = Route.useLoaderData();
  const { me } = Route.useRouteContext();
  const isOwner = group.ownerId === me.id;

  return (
    <AppShell>
      <ScreenHeader
        eyebrow={`${group.competition} · Round ${group.round}`}
        title={`${group.emoji} ${group.name}`}
        right={
          <Link
            to="/admin"
            className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        }
      />

      {/* Share invite link */}
      <section className="px-5 pb-4">
        <ShareCard
          inviteCode={group.inviteCode}
          memberCount={group.memberCount}
          isOwner={isOwner}
        />
      </section>

      {/* Copy this round's predictions to other same-league groups */}
      {siblingCount > 0 && (
        <section className="px-5 pb-4">
          <CopyPredictionsCard
            groupId={group.id}
            round={group.round}
            competition={group.competition}
            siblingCount={siblingCount}
          />
        </section>
      )}

      {/* Standings — scoped to this group */}
      <section className="px-5 pb-4">
        <Standings standings={standings} />
      </section>

      {/* Fixtures (read-only) */}
      <section className="space-y-3 px-5 pb-6">
        <h3 className="font-display text-xl">Round {group.round} fixtures</h3>
        {fixtures.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No matches published for this round yet.
            </p>
          </div>
        ) : (
          fixtures.map((f) => <FixtureCard key={f.id} fixture={f} />)
        )}
      </section>
    </AppShell>
  );
}

function ShareCard({
  inviteCode,
  memberCount,
  isOwner,
}: {
  inviteCode: string;
  memberCount: number;
  isOwner: boolean;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/admin?join=${inviteCode}`
      : `/admin?join=${inviteCode}`;

  async function copy(value: string, what: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Invite friends
        </p>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> {memberCount} members
          {isOwner && (
            <span className="ml-1 flex items-center gap-1 rounded-full bg-joker/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-joker">
              <Crown className="h-2.5 w-2.5" /> Owner
            </span>
          )}
        </span>
      </div>

      <button
        onClick={() => copy(inviteCode, "code")}
        className="mt-3 flex w-full items-center justify-between rounded-2xl bg-background/60 px-4 py-3"
      >
        <span className="font-mono text-2xl tracking-widest">{inviteCode}</span>
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
          {copied === "code" ? (
            <>
              <Check className="h-4 w-4" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Code
            </>
          )}
        </span>
      </button>

      <button
        onClick={() => copy(link, "link")}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-display text-sm uppercase tracking-wider text-primary-foreground shadow-glow"
      >
        {copied === "link" ? (
          <>
            <Check className="h-4 w-4" /> Link copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" /> Copy invite link
          </>
        )}
      </button>
    </div>
  );
}

function CopyPredictionsCard({
  groupId,
  round,
  competition,
  siblingCount,
}: {
  groupId: string;
  round: number;
  competition: string;
  siblingCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "info" | "error"; text: string } | null>(
    null,
  );

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await copyPredictionsToMyGroups({ data: { groupId, round } });
      if (res.groups === 0) {
        setMessage({
          kind: "info",
          text: "Nothing to copy yet — add this round's predictions first.",
        });
      } else {
        setMessage({
          kind: "ok",
          text: `Copied to ${res.groups} other ${competition} group${res.groups > 1 ? "s" : ""}.`,
        });
      }
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Copy failed" });
    } finally {
      setBusy(false);
    }
  }

  const tone =
    message?.kind === "ok"
      ? "bg-success/15 text-success"
      : message?.kind === "error"
        ? "bg-destructive/15 text-destructive"
        : "bg-muted/30 text-muted-foreground";

  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Sync predictions
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Copy your Round {round} predictions to your {siblingCount} other {competition} group
        {siblingCount > 1 ? "s" : ""}. Only matches that haven't kicked off are updated.
      </p>
      <button
        onClick={run}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-display text-sm uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-60"
      >
        <CopyPlus className="h-4 w-4" />
        {busy ? "Copying…" : "Copy to my other groups"}
      </button>
      {message && <p className={`mt-2 rounded-xl px-3 py-2 text-xs ${tone}`}>{message.text}</p>}
    </div>
  );
}

type Standing = Awaited<ReturnType<typeof getLeaderboard>>[number];

function Standings({ standings }: { standings: Standing[] }) {
  return (
    <div>
      <h3 className="mb-3 font-display text-xl">Standings</h3>
      {standings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-8 text-center text-sm text-muted-foreground">
          No members yet — share the invite link above.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-3xl border border-border bg-surface">
          {standings.map((m) => (
            <li
              key={m.id}
              className={[
                "grid grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0",
                m.isMe ? "bg-primary/10" : "",
              ].join(" ")}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-background font-display text-sm text-muted-foreground">
                {m.rank}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 font-display text-xs">
                {m.avatar}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                {m.streak > 0 && (
                  <p className="flex items-center gap-1 text-[11px] text-joker">
                    <Flame className="h-3 w-3" /> {m.streak} streak
                  </p>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {m.exact}× exact
              </span>
              <span className="font-display text-xl text-primary">{m.points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Fixture = Awaited<ReturnType<typeof getFixtures>>[number];

function FixtureCard({ fixture: f }: { fixture: Fixture }) {
  const hasResult = f.resultHome !== null && f.resultAway !== null;

  const statusColors: Record<string, string> = {
    upcoming: "bg-muted/30 text-muted-foreground",
    live: "bg-success/20 text-success",
    finished: "bg-primary/15 text-primary",
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[11px] text-muted-foreground" suppressHydrationWarning>
          {kickoffFmt.format(new Date(f.kickoffAt))}
        </span>
        <div className="flex items-center gap-2">
          {hasResult && (
            <span className="font-display text-lg text-foreground">
              {f.resultHome} – {f.resultAway}
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusColors[f.status] ?? ""}`}
          >
            {f.status}
          </span>
        </div>
      </div>

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
    </article>
  );
}
