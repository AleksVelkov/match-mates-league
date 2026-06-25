import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { TeamCrest } from "@/components/TeamCrest";
import { getGroup, getMyGroups } from "@/api/groups";
import { getFixtures } from "@/api/fixtures";
import { getLeaderboard } from "@/api/leaderboard";
import { copyPredictionsToMyGroups } from "@/api/predictions";
import {
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Check,
  Copy,
  Share2,
  CopyPlus,
  Users,
  Crown,
  Flame,
  X,
} from "lucide-react";

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

  const [shareOpen, setShareOpen] = useState(false);
  const [standingsOpen, setStandingsOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyMsg, setCopyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleCopyPredictions() {
    setCopying(true);
    setCopyMsg(null);
    try {
      const res = await copyPredictionsToMyGroups({ data: { groupId: group.id, round: group.round } });
      if (res.groups === 0) {
        setCopyMsg({ ok: false, text: "Nothing to copy — add predictions first." });
      } else {
        setCopyMsg({
          ok: true,
          text: `Copied to ${res.groups} other ${group.competition} group${res.groups > 1 ? "s" : ""}.`,
        });
      }
    } catch (e) {
      setCopyMsg({ ok: false, text: e instanceof Error ? e.message : "Copy failed" });
    } finally {
      setCopying(false);
      setTimeout(() => setCopyMsg(null), 3500);
    }
  }

  return (
    <AppShell>
      <ScreenHeader
        eyebrow={`${group.competition} · Round ${group.round}`}
        title={`${group.emoji} ${group.name}`}
        right={
          <div className="flex items-center gap-2">
            {siblingCount > 0 && (
              <button
                onClick={handleCopyPredictions}
                disabled={copying}
                title={`Copy predictions to ${siblingCount} other group${siblingCount > 1 ? "s" : ""}`}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface disabled:opacity-50"
              >
                {copying ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <CopyPlus className="h-5 w-5" />
                )}
              </button>
            )}
            <button
              onClick={() => setShareOpen(true)}
              title="Invite friends"
              className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <Link
              to="/admin"
              className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </div>
        }
      />

      {/* Copy predictions toast */}
      {copyMsg && (
        <div
          className={[
            "mx-5 mb-3 rounded-2xl px-4 py-2.5 text-sm",
            copyMsg.ok
              ? "bg-success/15 text-success"
              : "bg-muted/30 text-muted-foreground",
          ].join(" ")}
        >
          {copyMsg.text}
        </div>
      )}

      {/* Fixtures — primary content */}
      <section className="space-y-3 px-5 pb-8">
        <h3 className="font-display text-xl">Round {group.round}</h3>
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

      {/* Share bottom sheet */}
      {shareOpen && (
        <ShareSheet
          inviteCode={group.inviteCode}
          memberCount={group.memberCount}
          isOwner={isOwner}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Standings — collapsible bottom drawer above nav */}
      <StandingsDrawer
        standings={standings}
        open={standingsOpen}
        onToggle={() => setStandingsOpen((o) => !o)}
      />
    </AppShell>
  );
}

// ─── Share sheet ─────────────────────────────────────────────────────────────

function ShareSheet({
  inviteCode,
  memberCount,
  isOwner,
  onClose,
}: {
  inviteCode: string;
  memberCount: number;
  isOwner: boolean;
  onClose: () => void;
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

  async function nativeShare() {
    try {
      await navigator.share({ title: "Join my ScorIQ group", url: link });
    } catch {
      /* cancelled or unsupported */
    }
  }

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-[400px]">
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-xl">Invite friends</p>
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {memberCount} member{memberCount !== 1 ? "s" : ""}
              {isOwner && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-joker/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-joker">
                  <Crown className="h-2.5 w-2.5" /> Owner
                </span>
              )}
            </p>

            <button
              onClick={() => copy(inviteCode, "code")}
              className="mb-3 flex w-full items-center justify-between rounded-2xl bg-background/60 px-4 py-3"
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
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-display text-sm uppercase tracking-wider text-primary-foreground shadow-glow"
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

            {canShare && (
              <button
                onClick={nativeShare}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 font-display text-sm uppercase tracking-wider text-muted-foreground"
              >
                <Share2 className="h-4 w-4" /> Share via…
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Standings drawer ─────────────────────────────────────────────────────────

type Standing = Awaited<ReturnType<typeof getLeaderboard>>[number];

function StandingsDrawer({
  standings,
  open,
  onToggle,
}: {
  standings: Standing[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]"
          onClick={onToggle}
        />
      )}
      <div className="fixed inset-x-0 bottom-[104px] z-40 flex justify-center px-3">
        <div className="w-full max-w-[440px]">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
            <button
              onClick={onToggle}
              className="flex w-full items-center justify-between px-5 py-3.5"
            >
              <span className="font-display text-base">Standings</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {standings.length} player{standings.length !== 1 ? "s" : ""}
                {open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </span>
            </button>

            {open && (
              <div className="max-h-[48vh] overflow-y-auto border-t border-border">
                {standings.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                    No members yet — share the invite link.
                  </p>
                ) : (
                  <ul>
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Fixture card (read-only) ─────────────────────────────────────────────────

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
