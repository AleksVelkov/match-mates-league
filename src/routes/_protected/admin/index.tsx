import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { getMyGroups, getAvailableLeagues, createGroup, joinGroup } from "@/api/groups";
import { Crown, ChevronRight, Plus, Hash } from "lucide-react";

export const Route = createFileRoute("/_protected/admin/")({
  head: () => ({ meta: [{ title: "ScorIQ — Admin" }] }),
  loader: async () => {
    const [groups, leagues] = await Promise.all([getMyGroups(), getAvailableLeagues()]);
    return { groups, leagues };
  },
  component: AdminIndexPage,
});

function AdminIndexPage() {
  const { groups, leagues } = Route.useLoaderData();
  const { me } = Route.useRouteContext();
  const navigate = useNavigate();

  const [sheet, setSheet] = useState<"create" | "join" | null>(null);
  const [joinCode, setJoinCode] = useState("");

  // Open the join sheet pre-filled when arriving via a shared invite link (?join=CODE).
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("join");
    if (code) {
      setJoinCode(code.toUpperCase());
      setSheet("join");
    }
  }, []);

  return (
    <AppShell>
      <ScreenHeader
        eyebrow="Groups"
        title="My Groups"
        right={
          <button
            onClick={() => setSheet("create")}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 font-display text-sm uppercase tracking-wider text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" /> New
          </button>
        }
      />

      {groups.length === 0 ? (
        <EmptyState onCreate={() => setSheet("create")} onJoin={() => setSheet("join")} />
      ) : (
        <section className="space-y-2 px-5">
          {groups.map((g) => {
            const isOwner = g.ownerId === me.id;
            return (
              <Link
                key={g.id}
                to="/admin/$groupId"
                params={{ groupId: g.id }}
                className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 transition-colors active:bg-surface-2"
              >
                <span className="text-3xl">{g.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display text-xl leading-none">{g.name}</span>
                    {isOwner && (
                      <span className="flex items-center gap-1 rounded-full bg-joker/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-joker">
                        <Crown className="h-2.5 w-2.5" /> Owner
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {g.competition} · Round {g.round}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}

          <button
            onClick={() => setSheet("join")}
            className="flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-border py-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Hash className="h-4 w-4" /> Join with invite code
          </button>
        </section>
      )}

      {sheet === "create" && (
        <CreateGroupSheet
          leagues={leagues}
          onClose={() => setSheet(null)}
          onCreated={(id) => navigate({ to: "/admin/$groupId", params: { groupId: id } })}
        />
      )}
      {sheet === "join" && (
        <JoinGroupSheet
          initialCode={joinCode}
          onClose={() => setSheet(null)}
          onJoined={(id) => navigate({ to: "/admin/$groupId", params: { groupId: id } })}
        />
      )}
    </AppShell>
  );
}

function EmptyState({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <div className="px-5 pt-4">
      <div className="flex flex-col items-center rounded-3xl border border-border bg-surface px-6 py-10 text-center">
        <div className="font-display text-7xl">⚽</div>
        <h2 className="mt-4 font-display text-2xl">No groups yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your league and invite friends to start predicting
        </p>
        <button
          onClick={onCreate}
          className="btn-primary mt-6 w-full rounded-2xl bg-primary py-3.5 font-display text-lg uppercase tracking-wider text-primary-foreground shadow-glow"
        >
          Create a group
        </button>
        <button
          onClick={onJoin}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 text-sm font-semibold"
        >
          <Hash className="h-4 w-4" /> Join with invite code
        </button>
      </div>
    </div>
  );
}

function CreateGroupSheet({
  leagues,
  onClose,
  onCreated,
}: {
  leagues: string[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("⚽");
  const [competition, setCompetition] = useState(leagues[0] ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { id } = await createGroup({ data: { name, emoji, competition } });
      onCreated(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (leagues.length === 0) {
    return (
      <Overlay onClose={onClose}>
        <h2 className="font-display text-2xl">Create a group</h2>
        <p className="mt-4 rounded-xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          No leagues are available right now. Check back once an admin publishes one.
        </p>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="font-display text-2xl">Create a group</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a league and name your group — then share the invite link with friends.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="League">
          <select
            value={competition}
            onChange={(e) => setCompetition(e.target.value)}
            className="input-base"
          >
            {leagues.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Group name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={50}
            placeholder="Sunday Football Crew"
            className="input-base"
          />
        </Field>

        <Field label="Emoji">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(-2) || "⚽")}
            className="input-base w-20 text-center text-2xl"
          />
        </Field>

        {error && (
          <p className="rounded-xl bg-destructive/15 px-4 py-3 text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full rounded-xl bg-primary py-3.5 font-display text-lg uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create group"}
        </button>
      </form>
    </Overlay>
  );
}

function JoinGroupSheet({
  initialCode = "",
  onClose,
  onJoined,
}: {
  initialCode?: string;
  onClose: () => void;
  onJoined: (id: string) => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { groupId } = await joinGroup({ data: { inviteCode: code.trim() } });
      onJoined(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid invite code");
      setLoading(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="font-display text-2xl">Join a group</h2>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="Invite code">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            placeholder="ABC-1234"
            className="input-base font-mono tracking-widest"
          />
        </Field>

        {error && (
          <p className="rounded-xl bg-destructive/15 px-4 py-3 text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full rounded-xl bg-primary py-3.5 font-display text-lg uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {loading ? "Joining…" : "Join group"}
        </button>
      </form>
    </Overlay>
  );
}

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 max-h-[85vh] w-full max-w-[400px] overflow-y-auto rounded-3xl border border-border bg-background p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
