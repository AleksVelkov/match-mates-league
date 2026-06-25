import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, User, UsersRound } from "lucide-react";

const tabs: ReadonlyArray<{
  to: "/" | "/profile" | "/admin";
  label: string;
  icon: typeof Home;
  exact?: boolean;
}> = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/admin", label: "Groups", icon: UsersRound },
  { to: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background">
      <main className="flex-1 pb-28">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center">
        <div className="mx-3 mb-3 w-full max-w-[420px] rounded-3xl border border-border bg-surface/90 px-2 py-2 shadow-card backdrop-blur-xl">
          <ul className="grid grid-cols-3">
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
        <h1 className={[
          "font-display leading-tight",
          title.length > 24 ? "text-2xl" : title.length > 16 ? "text-3xl" : "text-4xl",
        ].join(" ")}>{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {right}
        <img src="/logo.png" alt="ScorIQ" className="h-9 w-9 object-contain opacity-80" />
      </div>
    </header>
  );
}
