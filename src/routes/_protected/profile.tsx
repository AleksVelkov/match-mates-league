import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { useTheme } from "@/components/ThemeToggle";
import { signOut } from "@/api/auth";
import { getAvailableLeagues } from "@/api/groups";
import { getMyProfile, updateMyName, updateMyCountry, uploadAvatar, getSeasons, getMySeasonStats, deleteMyAccount } from "@/api/profile";
import { getFavoriteLeague, setFavoriteLeague } from "@/api/preferences";
import { Camera, Check, ChevronDown, ChevronRight, Flame, LogOut, Moon, Sun, Target, Trash2, Trophy, X } from "lucide-react";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_protected/profile")({
  head: () => ({
    meta: [
      { title: "ScorIQ — Profile" },
      { name: "description", content: "Your profile, stats, and achievements." },
    ],
  }),
  loader: async () => {
    const [profile, favLeague, leagues, allSeasons] = await Promise.all([
      getMyProfile(),
      getFavoriteLeague(),
      getAvailableLeagues(),
      getSeasons(),
    ]);
    // Load season stats for all seasons in parallel
    const seasonStats = await Promise.all(
      allSeasons.map((s) =>
        getMySeasonStats({ data: { seasonId: s.id } }).catch(() => ({
          seasonId: s.id, points: 0, exact: 0, predicted: 0, correct: 0,
        })),
      ),
    );
    return { profile, favLeague, leagues, allSeasons, seasonStats };
  },
  component: ProfilePage,
});

// ─── Country data ─────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "GB", name: "United Kingdom" }, { code: "US", name: "United States" },
  { code: "DE", name: "Germany" }, { code: "FR", name: "France" },
  { code: "ES", name: "Spain" }, { code: "IT", name: "Italy" },
  { code: "PT", name: "Portugal" }, { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" }, { code: "TR", name: "Turkey" },
  { code: "PL", name: "Poland" }, { code: "RO", name: "Romania" },
  { code: "MK", name: "North Macedonia" }, { code: "RS", name: "Serbia" },
  { code: "HR", name: "Croatia" }, { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "SI", name: "Slovenia" }, { code: "SK", name: "Slovakia" },
  { code: "CZ", name: "Czech Republic" }, { code: "HU", name: "Hungary" },
  { code: "AT", name: "Austria" }, { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" }, { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" }, { code: "FI", name: "Finland" },
  { code: "GR", name: "Greece" }, { code: "UA", name: "Ukraine" },
  { code: "RU", name: "Russia" }, { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" }, { code: "MX", name: "Mexico" },
  { code: "CO", name: "Colombia" }, { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" }, { code: "CN", name: "China" },
  { code: "IN", name: "India" }, { code: "AU", name: "Australia" },
  { code: "NG", name: "Nigeria" }, { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" }, { code: "MA", name: "Morocco" },
  { code: "CA", name: "Canada" }, { code: "IE", name: "Ireland" },
  { code: "NZ", name: "New Zealand" }, { code: "SG", name: "Singapore" },
  { code: "AE", name: "UAE" }, { code: "SA", name: "Saudi Arabia" },
  { code: "IL", name: "Israel" }, { code: "PK", name: "Pakistan" },
].sort((a, b) => a.name.localeCompare(b.name));

function countryFlag(code: string) {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

// ─── Achievements ─────────────────────────────────────────────────────────────

const ACHIEVEMENTS = [
  { id: "a1", name: "First Exact", description: "Nail one on the head.", icon: "🎯", unlocked: (s: AchStats) => s.exact >= 1 },
  { id: "a2", name: "10 Exact", description: "You see the future.", icon: "🔮", unlocked: (s: AchStats) => s.exact >= 10 },
  { id: "a3", name: "25 Exact", description: "Certified clairvoyant.", icon: "🧿", unlocked: (s: AchStats) => s.exact >= 25 },
  { id: "a6", name: "Unstoppable", description: "10 correct in a row.", icon: "⚡", unlocked: (s: AchStats) => s.streak >= 10 },
  { id: "a7", name: "Legend", description: "Reach 1000 total points.", icon: "👑", unlocked: (s: AchStats) => s.points >= 1000 },
  { id: "a4", name: "Century", description: "Reach 100 total points.", icon: "💯", unlocked: (s: AchStats) => s.points >= 100 },
];
type AchStats = { points: number; exact: number; streak: number };

// ─── Page ─────────────────────────────────────────────────────────────────────

function ProfilePage() {
  const { profile, favLeague, leagues, allSeasons, seasonStats } = Route.useLoaderData();
  const router = useRouter();
  const { theme, toggle, mounted } = useTheme();

  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameVal, setNameVal] = useState(profile.name);
  const [nameSaving, setNameSaving] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.navigate({ to: "/login" });
      router.invalidate();
    } catch {
      setSigningOut(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteMyAccount();
      router.navigate({ to: "/login" });
    } catch {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleSaveName() {
    if (!nameVal.trim() || nameVal.trim() === profile.name) { setNameEditing(false); return; }
    setNameSaving(true);
    try {
      await updateMyName({ data: { name: nameVal.trim() } });
      router.invalidate();
      setNameEditing(false);
    } finally {
      setNameSaving(false);
    }
  }

  async function handleSelectLeague(league: string) {
    await setFavoriteLeague({ data: { league } });
    router.invalidate();
    setLeagueOpen(false);
  }

  async function handleSelectCountry(code: string, name: string) {
    await updateMyCountry({ data: { country: name, countryCode: code } });
    router.invalidate();
    setCountryOpen(false);
  }

  // Aggregate totals across all seasons for achievements
  const totalPoints = seasonStats.reduce((s, r) => s + r.points, 0);
  const totalExact = seasonStats.reduce((s, r) => s + r.exact, 0);

  return (
    <AppShell>
      <ScreenHeader title="Profile" />

      {/* ── Avatar + Name ── */}
      <section className="px-5 pb-4">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface p-6">
          <AvatarUpload image={profile.image} name={profile.name} onUploaded={() => router.invalidate()} />

          {nameEditing ? (
            <div className="flex w-full max-w-xs items-center gap-2">
              <input
                autoFocus
                type="text"
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                maxLength={80}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-center font-display text-xl outline-none focus:border-primary"
              />
              <button onClick={handleSaveName} disabled={nameSaving} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
                {nameSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <Check className="h-4 w-4" />}
              </button>
              <button onClick={() => { setNameEditing(false); setNameVal(profile.name); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => setNameEditing(true)} className="text-center">
              <p className="font-display text-3xl leading-none">{profile.name}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Tap to edit name</p>
            </button>
          )}

          {/* Country */}
          <button
            onClick={() => setCountryOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-border bg-background/50 px-4 py-2 text-sm"
          >
            {profile.countryCode ? (
              <>
                <span className="text-xl">{countryFlag(profile.countryCode)}</span>
                <span>{profile.country}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Set your country</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </section>

      {/* ── Appearance + Sign out ── */}
      <section className="px-5 pb-4">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface">
          <button onClick={toggle} className="flex w-full items-center justify-between border-b border-border px-4 py-4 text-left">
            <div className="flex items-center gap-3">
              {mounted && theme === "dark" ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm font-semibold">Appearance</span>
            </div>
            <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              {mounted ? (theme === "dark" ? "Dark" : "Light") : ""}
              <span className={["relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", theme === "light" ? "bg-primary" : "bg-muted/40"].join(" ")}>
                <span className={["inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform", theme === "light" ? "translate-x-[22px]" : "translate-x-0.5"].join(" ")} />
              </span>
            </span>
          </button>
          <button onClick={handleSignOut} disabled={signingOut} className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-left text-sm font-semibold text-destructive disabled:opacity-60">
            <LogOut className="h-5 w-5" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
          <button onClick={() => setDeleteOpen(true)} className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-semibold text-destructive/70 hover:text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete account
          </button>
        </div>
      </section>

      {deleteOpen && (
        <DeleteAccountModal
          deleting={deleting}
          onConfirm={handleDeleteAccount}
          onClose={() => setDeleteOpen(false)}
        />
      )}

      {/* ── Favorite league dropdown ── */}
      {leagues.length > 0 && (
        <section className="px-5 pb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1">Favorite league</p>
          <button
            onClick={() => setLeagueOpen(true)}
            className="flex w-full items-center justify-between rounded-3xl border border-border bg-surface px-5 py-4"
          >
            <span className="text-sm font-semibold">{favLeague}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </section>
      )}

      {/* ── Achievements ── */}
      <section className="px-5 pb-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1">Achievements</p>
        <div className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = a.unlocked({ points: totalPoints, exact: totalExact, streak: 0 });
            return (
              <div key={a.id} className={["rounded-2xl border p-3 transition-all", unlocked ? "border-primary/40 bg-gradient-to-br from-primary/15 to-surface" : "border-border bg-surface opacity-50"].join(" ")}>
                <div className="text-2xl">{a.icon}</div>
                <div className="mt-1 text-sm font-semibold leading-tight">{a.name}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground leading-tight">{a.description}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Season stats ── */}
      {allSeasons.length > 0 && (
        <section className="px-5 pb-8">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1">Season stats</p>
          <div className="space-y-3">
            {allSeasons.map((s) => {
              const stats = seasonStats.find((r) => r.seasonId === s.id);
              const now = new Date();
              const isActive = new Date(s.startDate) <= now && now <= new Date(s.endDate);
              return (
                <div key={s.id} className={["overflow-hidden rounded-3xl border border-border bg-surface", isActive ? "ring-1 ring-primary/40" : ""].join(" ")}>
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="font-display text-base">{s.name}</span>
                    <div className="flex items-center gap-2">
                      {isActive && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">Active</span>}
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(s.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {" – "}
                        {new Date(s.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 divide-x divide-border">
                    {[
                      { label: "Points", value: stats?.points ?? 0, icon: <Trophy className="h-3 w-3" /> },
                      { label: "Exact", value: stats?.exact ?? 0, icon: <Target className="h-3 w-3" /> },
                      { label: "Correct", value: stats?.correct ?? 0, icon: <Check className="h-3 w-3" /> },
                      { label: "Played", value: stats?.predicted ?? 0, icon: <Flame className="h-3 w-3" /> },
                    ].map((stat) => (
                      <div key={stat.label} className="flex flex-col items-center py-3">
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">{stat.icon}{stat.label}</span>
                        <span className="mt-0.5 font-display text-2xl">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Preferences ── */}
      <section className="px-5 pb-4">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Preferences</p>
        <div className="overflow-hidden rounded-3xl border border-border bg-surface">
          <UsageDataRow />
          <div className="border-t border-border">
            <NotificationsRow />
          </div>
        </div>
      </section>

      {/* ── Help ── */}
      <section className="px-5 pb-4">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Help</p>
        <div className="overflow-hidden rounded-3xl border border-border bg-surface">
          <Link to="/guide" className="flex items-center justify-between px-4 py-4">
            <span className="text-sm font-semibold">How to play</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      {/* ── Legal ── */}
      <section className="px-5 pb-8">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Legal</p>
        <div className="overflow-hidden rounded-3xl border border-border bg-surface">
          <Link to="/privacy-policy" className="flex items-center justify-between border-b border-border px-4 py-4">
            <span className="text-sm font-semibold">Privacy Policy</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/terms" className="flex items-center justify-between px-4 py-4">
            <span className="text-sm font-semibold">Terms of Service</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      {/* ── Country picker modal ── */}
      {countryOpen && (
        <CountryPickerModal
          current={profile.countryCode ?? ""}
          onSelect={handleSelectCountry}
          onClose={() => setCountryOpen(false)}
        />
      )}

      {/* ── League picker modal ── */}
      {leagueOpen && (
        <LeaguePickerModal
          current={favLeague}
          leagues={leagues}
          onSelect={handleSelectLeague}
          onClose={() => setLeagueOpen(false)}
        />
      )}
    </AppShell>
  );
}

// ─── Preference helpers ───────────────────────────────────────────────────────

function useLocalBool(key: string, defaultVal: boolean): [boolean, (v: boolean) => void] {
  const [val, setVal] = useState(defaultVal);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setVal(stored === "true");
    } catch {}
    setHydrated(true);
  }, [key]);

  function set(v: boolean) {
    setVal(v);
    try { localStorage.setItem(key, String(v)); } catch {}
  }

  return [hydrated ? val : defaultVal, set];
}

function ToggleSwitch({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      aria-checked={on}
      role="switch"
      className={["relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50", on ? "bg-primary" : "bg-muted/40"].join(" ")}
    >
      <span className={["inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5"].join(" ")} />
    </button>
  );
}

function UsageDataRow() {
  const [enabled, setEnabled] = useLocalBool("scoriq_analytics", false);
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">Share usage data</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Anonymous analytics to help improve ScorIQ. No personal data is ever shared.
        </p>
      </div>
      <ToggleSwitch on={enabled} onChange={setEnabled} />
    </div>
  );
}

function NotificationsRow() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  async function handleToggle() {
    if (permission !== "default") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  const isOn = permission === "granted";
  const isDenied = permission === "denied";
  const isUnsupported = permission === "unsupported";

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">Notifications</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground" suppressHydrationWarning>
          {isDenied
            ? "Blocked — allow in browser settings to enable."
            : isUnsupported
              ? "Not supported on this browser."
              : isOn
                ? "You'll be notified when results are published."
                : "Get notified when new results are available."}
        </p>
      </div>
      <ToggleSwitch
        on={isOn}
        onChange={handleToggle}
        disabled={isDenied || isUnsupported || isOn}
      />
    </div>
  );
}

// ─── Avatar upload ─────────────────────────────────────────────────────────────

function AvatarUpload({ image, name, onUploaded }: { image: string | null; name: string; onUploaded: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function initials(n: string) {
    return n.split(" ").map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB."); return; }

    setUploading(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await uploadAvatar({ data: { filename: file.name, contentType: file.type, base64 } });
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={() => fileRef.current?.click()} disabled={uploading} className="relative disabled:opacity-70">
        <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-primary font-display text-3xl text-primary-foreground shadow-glow">
          {image ? <img src={image} alt={name} className="h-full w-full object-cover" /> : initials(name)}
        </div>
        <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-2 border-surface bg-surface-2 shadow">
          {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <Camera className="h-4 w-4" />}
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Delete account modal ─────────────────────────────────────────────────────

function DeleteAccountModal({ deleting, onConfirm, onClose }: { deleting: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={!deleting ? onClose : undefined} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
        <div className="w-full max-w-[360px] animate-in fade-in zoom-in-95 duration-200">
          <div className="overflow-hidden rounded-3xl border border-destructive/30 bg-surface shadow-card">
            <div className="px-6 pb-2 pt-6">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-destructive/15">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <p className="font-display text-2xl leading-tight">Delete account?</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This permanently deletes your account, all your predictions, and removes you from every group. This action cannot be undone.
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Under GDPR you have the right to erasure. All personal data will be removed from our servers immediately.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <button
                onClick={onClose}
                disabled={deleting}
                className="rounded-2xl border border-border bg-surface py-3 text-sm font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={deleting}
                className="flex items-center justify-center gap-2 rounded-2xl bg-destructive py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Country picker modal ──────────────────────────────────────────────────────

function CountryPickerModal({ current, onSelect, onClose }: { current: string; onSelect: (code: string, name: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="flex max-h-[80vh] w-full max-w-[420px] flex-col rounded-3xl border border-border bg-surface shadow-card animate-in fade-in zoom-in-95 duration-200">
          <div className="flex shrink-0 items-center justify-between px-5 py-4 border-b border-border">
            <p className="font-display text-xl">Select country</p>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface"><X className="h-4 w-4" /></button>
          </div>
          <div className="shrink-0 px-4 py-3 border-b border-border">
            <input
              autoFocus
              type="text"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <ul className="flex-1 overflow-y-auto">
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  onClick={() => onSelect(c.code, c.name)}
                  className={["flex w-full items-center gap-3 border-b border-border px-5 py-3 text-left text-sm last:border-b-0", current === c.code ? "bg-primary/10 text-primary font-semibold" : ""].join(" ")}
                >
                  <span className="text-xl">{countryFlag(c.code)}</span>
                  {c.name}
                  {current === c.code && <Check className="ml-auto h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

// ─── League picker modal ───────────────────────────────────────────────────────

function LeaguePickerModal({ current, leagues, onSelect, onClose }: { current: string; leagues: string[]; onSelect: (l: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-200">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="font-display text-xl">Favorite league</p>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface"><X className="h-4 w-4" /></button>
            </div>
            <ul>
              {leagues.map((l, i) => (
                <li key={l}>
                  <button
                    onClick={() => onSelect(l)}
                    className={["flex w-full items-center justify-between px-5 py-4 text-left text-sm", i < leagues.length - 1 ? "border-b border-border" : "", current === l ? "text-primary font-semibold" : ""].join(" ")}
                  >
                    {l}
                    {current === l && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
