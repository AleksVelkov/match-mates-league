import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Target, Trophy, User, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const tabs: ReadonlyArray<{ to: "/" | "/predictions" | "/leaderboard" | "/profile" | "/admin"; label: string; icon: typeof Home; exact?: boolean }> = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/predictions", label: "Predict", icon: Target },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background">
      <div className="fixed right-3 top-3 z-50 sm:right-[max(0.75rem,calc(50%-220px+0.75rem))]">
        <ThemeToggle />
      </div>
      <main className="flex-1 pb-28">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center">
        <div className="mx-3 mb-3 w-full max-w-[420px] rounded-3xl border border-border bg-surface/90 px-2 py-2 shadow-card backdrop-blur-xl">
          <ul className="grid grid-cols-5">
            {tabs.map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <li key={t.to}>
                  <Link
                    to={t.to}
                    className="flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-all"
                  >
                    <span
                      className={[
                        "grid h-10 w-10 place-items-center rounded-2xl transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.4} />
                    </span>
                    <span
                      className={[
                        "text-[10px] font-semibold uppercase tracking-wider",
                        active ? "text-foreground" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {t.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </div>
  );
}

export function ScreenHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-5 pb-4 pt-8">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate font-display text-4xl leading-none">{title}</h1>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
