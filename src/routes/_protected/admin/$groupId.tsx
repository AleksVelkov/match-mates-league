import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { TeamCrest } from "@/components/TeamCrest";
import { getGroup, getMyGroups, getGroupMembers, updateGroup, removeMember } from "@/api/groups";
import { getFixtures } from "@/api/fixtures";
import { getLeaderboard } from "@/api/leaderboard";
import { getMyPredictions, savePredictions, copyPredictionsToMyGroups } from "@/api/predictions";
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
  Settings,
  UserMinus,
  X,
  Save,
  Star,
} from "lucide-react";

export const Route = createFileRoute("/_protected/admin/$groupId")({
  head: () => ({ meta: [{ title: "ScorIQ — Group" }] }),
  loader: async ({ params }) => {
    const group = await getGroup({ data: { groupId: params.groupId } });
    const [fixtures, standings, myGroups, members, myPreds] = await Promise.all([
      getFixtures({ data: { groupId: params.groupId, round: group.round } }),
      getLeaderboard({ data: { groupId: params.groupId } }),
      getMyGroups(),
      getGroupMembers({ data: { groupId: params.groupId } }),
      getMyPredictions({ data: { groupId: params.groupId, round: group.round } }),
    ]);
    const siblingCount = myGroups.filter(
      (g) => g.competition === group.competition && g.id !== group.id,
    ).length;
    return { group, fixtures, standings, siblingCount, members, myPreds };
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

// ─── Types ────────────────────────────────────────────────────────────────────

type PredRow = {
  id: string;
  homeShort: string;
  awayShort: string;
  homeCrest: string | null;
  awayCrest: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  kickoff: string;
  status: "upcoming" | "live" | "finished";
  resultHome: number | null;
  resultAway: number | null;
  predictionHome: number | null;
  predictionAway: number | null;
  isJoker: boolean;
  locked: boolean;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminGroupPage() {
  const { group, fixtures: rawFixtures, standings, siblingCount, members, myPreds } =
    Route.useLoaderData();
  const { me } = Route.useRouteContext();
  const router = useRouter();
  const isOwner = group.ownerId === me.id;

  const [shareOpen, setShareOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [standingsOpen, setStandingsOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyMsg, setCopyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Prediction state ─────────────────────────────────────────────────────
  const now = Date.now();
  const predMap = useMemo(
    () => new Map(myPreds.map((p) => [p.fixtureId, p])),
    [myPreds],
  );

  const initial: PredRow[] = useMemo(
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
            homeCrest: f.homeCrest ?? null,
            awayCrest: f.awayCrest ?? null,
            homeTeamId: f.homeTeamId ?? null,
            awayTeamId: f.awayTeamId ?? null,
            kickoff,
            status: f.status,
            resultHome: f.resultHome ?? null,
            resultAway: f.resultAway ?? null,
            predictionHome: p?.scoreHome ?? null,
            predictionAway: p?.scoreAway ?? null,
            isJoker: p?.isJoker ?? false,
            locked: new Date(kickoff).getTime() <= now,
          };
        }),
    [rawFixtures, predMap, now],
  );

  const [rows, setRows] = useState<PredRow[]>(initial);
  // Track latest rows synchronously so debounced saves always read fresh values
  const rowsRef = useRef<PredRow[]>(initial);
  const debounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [saveStates, setSaveStates] = useState<Map<string, "saving" | "saved" | "error">>(new Map());
  const [saveErrors, setSaveErrors] = useState<Map<string, string>>(new Map());

  const submitted = rows.filter((f) => f.predictionHome !== null && f.predictionAway !== null).length;
  const total = rows.length;
  const jokerId = useMemo(() => rows.find((f) => f.isJoker)?.id ?? null, [rows]);

  const saveSingleRow = useCallback(
    async (f: PredRow) => {
      if (f.locked) return;
      if (f.predictionHome === null && f.predictionAway === null && !f.isJoker) return;
      setSaveStates((m) => new Map(m).set(f.id, "saving"));
      setSaveErrors((m) => { const n = new Map(m); n.delete(f.id); return n; });
      try {
        await savePredictions({
          data: {
            groupId: group.id,
            round: group.round,
            predictions: [{ fixtureId: f.id, scoreHome: f.predictionHome, scoreAway: f.predictionAway, isJoker: f.isJoker }],
          },
        });
        setSaveStates((m) => new Map(m).set(f.id, "saved"));
        setTimeout(() => {
          setSaveStates((m) => {
            const n = new Map(m);
            if (n.get(f.id) === "saved") n.delete(f.id);
            return n;
          });
        }, 2000);
      } catch (e) {
        setSaveStates((m) => new Map(m).set(f.id, "error"));
        setSaveErrors((m) => new Map(m).set(f.id, e instanceof Error ? e.message : "Save failed"));
      }
    },
    [group.id, group.round],
  );

  function setScore(id: string, side: "home" | "away", raw: string) {
    const n = raw === "" ? null : Math.max(0, Math.min(99, parseInt(raw, 10) || 0));
    setRows((prev) => {
      const next = prev.map((f) => {
        if (f.id !== id) return f;
        return side === "home" ? { ...f, predictionHome: n } : { ...f, predictionAway: n };
      });
      rowsRef.current = next;
      return next;
    });
    // Debounce save per fixture — 700ms after last keystroke
    const existing = debounceRefs.current.get(id);
    if (existing) clearTimeout(existing);
    debounceRefs.current.set(
      id,
      setTimeout(() => {
        debounceRefs.current.delete(id);
        const f = rowsRef.current.find((r) => r.id === id);
        if (f) saveSingleRow(f);
      }, 700),
    );
  }

  function toggleJoker(id: string) {
    setRows((prev) => {
      const next = prev.map((f) => ({ ...f, isJoker: f.id === id ? !f.isJoker : false }));
      rowsRef.current = next;
      return next;
    });
    // Save joker change immediately (next tick so ref is updated)
    setTimeout(() => {
      const f = rowsRef.current.find((r) => r.id === id);
      if (f) saveSingleRow(f);
    }, 0);
  }

  async function handleCopyPredictions() {
    setCopying(true);
    setCopyMsg(null);
    try {
      const res = await copyPredictionsToMyGroups({ data: { groupId: group.id, round: group.round } });
      setCopyMsg(
        res.groups === 0
          ? { ok: false, text: "Nothing to copy — add predictions first." }
          : { ok: true, text: `Copied to ${res.groups} other ${group.competition} group${res.groups > 1 ? "s" : ""}.` },
      );
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
            {isOwner && (
              <button
                onClick={() => setManageOpen(true)}
                title="Manage group"
                className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}
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
            copyMsg.ok ? "bg-success/15 text-success" : "bg-muted/30 text-muted-foreground",
          ].join(" ")}
        >
          {copyMsg.text}
        </div>
      )}

      {/* ── Round predictions ── */}
      <section className="px-5">
        <h3 className="mb-3 font-display text-xl">Round {group.round}</h3>

        {total === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No matches published for this round yet.
            </p>
          </div>
        ) : (
          <>
            {/* Progress + joker hint */}
            <div className="mb-4 rounded-3xl border border-border bg-surface p-4">
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

            {/* Fixture rows with prediction inputs */}
            <div className="space-y-3">
              {rows.map((f) => (
                <PredictionRow
                  key={f.id}
                  fixture={f}
                  saveState={saveStates.get(f.id) ?? null}
                  saveError={saveErrors.get(f.id) ?? null}
                  onScore={(side, v) => setScore(f.id, side, v)}
                  onJoker={() => toggleJoker(f.id)}
                />
              ))}
            </div>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Predictions are saved automatically. They stay hidden until each kickoff.
            </p>
          </>
        )}

        {/* Spacer so content clears the standings drawer */}
        <div className="h-52" aria-hidden />
      </section>

      {/* Share modal */}
      {shareOpen && (
        <ShareSheet
          inviteCode={group.inviteCode}
          memberCount={group.memberCount}
          isOwner={isOwner}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Manage modal — owner only */}
      {manageOpen && isOwner && (
        <ManageSheet
          group={group}
          members={members}
          ownerId={group.ownerId}
          onClose={() => setManageOpen(false)}
          onSaved={() => {
            setManageOpen(false);
            router.invalidate();
          }}
        />
      )}

      {/* Standings drawer */}
      <StandingsDrawer
        standings={standings}
        open={standingsOpen}
        onToggle={() => setStandingsOpen((o) => !o)}
      />
    </AppShell>
  );
}

// ─── Prediction row ───────────────────────────────────────────────────────────

function PredictionRow({
  fixture,
  saveState,
  saveError,
  onScore,
  onJoker,
}: {
  fixture: PredRow;
  saveState: "saving" | "saved" | "error" | null;
  saveError: string | null;
  onScore: (side: "home" | "away", v: string) => void;
  onJoker: () => void;
}) {
  const isComplete = fixture.predictionHome !== null && fixture.predictionAway !== null;
  const hasResult = fixture.resultHome !== null && fixture.resultAway !== null;
  const [editingSide, setEditingSide] = useState<"home" | "away" | null>(null);

  const statusColors: Record<string, string> = {
    upcoming: "bg-muted/30 text-muted-foreground",
    live: "bg-success/20 text-success",
    finished: "bg-primary/15 text-primary",
  };

  return (
    <article
      className={[
        "overflow-hidden rounded-3xl border transition-colors",
        isComplete && !editingSide && !fixture.locked ? "opacity-70" : "",
        fixture.isJoker
          ? "border-joker/60 bg-gradient-to-br from-joker/15 to-surface"
          : "border-border bg-surface",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="font-display text-sm text-foreground" suppressHydrationWarning>
          {kickoffFmt.format(new Date(fixture.kickoff))}
          {fixture.locked && (
            <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              Locked
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {/* Per-fixture save indicator */}
          {saveState === "saving" && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
          {saveState === "saved" && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-success animate-in fade-in duration-200">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          {hasResult && (
            <span className="font-display text-lg text-foreground">
              {fixture.resultHome}–{fixture.resultAway}
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusColors[fixture.status] ?? ""}`}
          >
            {fixture.status}
          </span>
          {!fixture.locked && (
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
              {fixture.isJoker ? "×2" : "Joker"}
            </button>
          )}
        </div>
      </div>
      {saveState === "error" && saveError && (
        <p className="px-4 pt-1 text-[10px] text-destructive">{saveError}</p>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-4 pt-3">
        {/* Home */}
        <TeamLink teamId={fixture.homeTeamId}>
          <div className="flex items-center gap-2 min-w-0">
            <TeamCrest short={fixture.homeShort} crestUrl={fixture.homeCrest} size={36} />
            <p className="truncate text-sm font-semibold">{fixture.homeShort}</p>
          </div>
        </TeamLink>

        {/* Score inputs */}
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
        <TeamLink teamId={fixture.awayTeamId}>
          <div className="flex items-center justify-end gap-2 min-w-0">
            <p className="truncate text-right text-sm font-semibold">{fixture.awayShort}</p>
            <TeamCrest short={fixture.awayShort} crestUrl={fixture.awayCrest} size={36} />
          </div>
        </TeamLink>
      </div>
    </article>
  );
}

/** Wraps children in a Link to the team page if teamId is available, else renders a plain span. */
function TeamLink({ teamId, children }: { teamId: string | null; children: ReactNode }) {
  if (!teamId) return <span>{children}</span>;
  return (
    <Link to="/team/$teamId" params={{ teamId }} className="shrink-0">
      {children}
    </Link>
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
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      aria-label={label}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder="–"
      className={[
        "h-12 w-12 rounded-xl border border-border bg-background text-center font-display text-2xl leading-none text-foreground",
        "outline-none focus:border-primary focus:ring-2 focus:ring-primary/40",
        "placeholder:text-muted-foreground/40 disabled:opacity-50",
        "transition-all duration-150",
      ].join(" ")}
    />
  );
}

// ─── Manage sheet ─────────────────────────────────────────────────────────────

type Member = Awaited<ReturnType<typeof getGroupMembers>>[number];

function ManageSheet({
  group,
  members,
  ownerId,
  onClose,
  onSaved,
}: {
  group: { id: string; name: string; emoji: string };
  members: Member[];
  ownerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [emoji, setEmoji] = useState(group.emoji);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removeMsg, setRemoveMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [localMembers, setLocalMembers] = useState(members);

  const dirty = name.trim() !== group.name || emoji.trim() !== group.emoji;

  async function handleSave() {
    if (!dirty || !name.trim() || !emoji.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateGroup({ data: { groupId: group.id, name: name.trim(), emoji: emoji.trim() } });
      onSaved();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save changes");
      setSaving(false);
    }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    setRemoveMsg(null);
    try {
      await removeMember({ data: { groupId: group.id, userId } });
      setRemoveMsg({ id: userId, ok: true, text: "Member removed." });
      setConfirmId(null);
      setLocalMembers((m) => m.filter((x) => x.id !== userId));
    } catch (e) {
      setRemoveMsg({ id: userId, ok: false, text: e instanceof Error ? e.message : "Remove failed" });
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="flex max-h-[82vh] w-full max-w-[440px] flex-col rounded-3xl border border-border bg-surface shadow-card animate-in fade-in zoom-in-95 duration-200">
          <div className="flex shrink-0 items-center justify-between px-5 py-4 border-b border-border">
            <p className="font-display text-xl">Manage group</p>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Group identity</p>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Icon</label>
                  <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4}
                    className="h-12 w-16 rounded-2xl border border-border bg-background text-center text-2xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="Group name"
                    className="h-12 flex-1 rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              {saveError && <p className="mt-2 text-xs text-destructive">{saveError}</p>}
              <button onClick={handleSave} disabled={!dirty || saving || !name.trim() || !emoji.trim()}
                className="btn-primary mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-display text-sm uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-40">
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Members · {localMembers.length}</p>
              <ul className="overflow-hidden rounded-3xl border border-border bg-background/50">
                {localMembers.map((m, i) => {
                  const isOwnerRow = m.id === ownerId;
                  const isConfirming = confirmId === m.id;
                  const isRemoving = removingId === m.id;
                  const msg = removeMsg?.id === m.id ? removeMsg : null;
                  if (msg?.ok) return null;

                  const avatar = m.name.split(" ").map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2);

                  return (
                    <li key={m.id} className={["border-b border-border last:border-b-0", i % 2 === 0 ? "" : "bg-surface/40"].join(" ")}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 font-display text-xs">{avatar}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{m.name}</p>
                          {isOwnerRow && (
                            <p className="flex items-center gap-1 text-[10px] text-joker"><Crown className="h-2.5 w-2.5" /> Owner</p>
                          )}
                        </div>
                        {!isOwnerRow && (
                          isConfirming ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Remove?</span>
                              <button onClick={() => handleRemove(m.id)} disabled={isRemoving}
                                className="rounded-lg bg-destructive px-2.5 py-1 text-[11px] font-semibold text-destructive-foreground disabled:opacity-50">
                                {isRemoving ? "…" : "Yes"}
                              </button>
                              <button onClick={() => setConfirmId(null)}
                                className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmId(m.id)} title="Remove member"
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:border-destructive hover:text-destructive">
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )
                        )}
                      </div>
                      {msg && !msg.ok && <p className="px-4 pb-2 text-xs text-destructive">{msg.text}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Share sheet ──────────────────────────────────────────────────────────────

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
    } catch { /* clipboard unavailable */ }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: "Join my ScorIQ group", url: link });
    } catch { /* cancelled */ }
  }

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-200">
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-xl">Invite friends</p>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface">
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

            <button onClick={() => copy(inviteCode, "code")}
              className="mb-3 flex w-full items-center justify-between rounded-2xl bg-background/60 px-4 py-3">
              <span className="font-mono text-2xl tracking-widest">{inviteCode}</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
                {copied === "code" ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Code</>}
              </span>
            </button>

            <button onClick={() => copy(link, "link")}
              className="btn-primary mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-display text-sm uppercase tracking-wider text-primary-foreground shadow-glow">
              {copied === "link" ? <><Check className="h-4 w-4" /> Link copied</> : <><Copy className="h-4 w-4" /> Copy invite link</>}
            </button>

            {canShare && (
              <button onClick={nativeShare}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 font-display text-sm uppercase tracking-wider text-muted-foreground">
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
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]" onClick={onToggle} />
      )}
      <div className="fixed inset-x-0 bottom-32 z-40 flex justify-center px-3">
        <div className="w-full max-w-[440px]">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
            <button onClick={onToggle} className="flex w-full items-center justify-between px-5 py-3.5">
              <span className="font-display text-base">Standings</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {standings.length} player{standings.length !== 1 ? "s" : ""}
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </span>
            </button>

            {open && (
              <div className="max-h-[48vh] overflow-y-auto border-t border-border animate-in slide-in-from-bottom-2 fade-in duration-200">
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
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-background font-display text-sm text-muted-foreground">{m.rank}</span>
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 font-display text-xs">{m.avatar}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{m.name}</p>
                          {m.streak > 0 && (
                            <p className="flex items-center gap-1 text-[11px] text-joker">
                              <Flame className="h-3 w-3" /> {m.streak} streak
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.exact}× exact</span>
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
