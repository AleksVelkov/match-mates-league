# ScorIQ — Claude Code Instructions

## Rules

- **Do not run local instances of the app for testing.** No `npm run dev`, `wrangler dev`, or any dev server. Verify changes with `npm run build` (type check + bundle).
- **Do not open or inspect Google Chrome / browser DevTools** unless the user explicitly asks.
- **Commit after every requested change** with a focused, descriptive message. Always add the `Co-Authored-By` trailer.
- **No bottom pop-ups / bottom sheets — ever.** All modals, dialogs, confirmation sheets, and overlays must be centered on screen (`fixed inset-0 flex items-center justify-center`). The only element allowed to live at the bottom is the persistent navigation bar and the standings drawer (which is a permanent fixture, not a pop-up).

## Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (full-stack React, SSR via Nitro) |
| Router | TanStack Router (file-based, `src/routes/`) |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Auth | Better Auth (`src/lib/session.ts`, `src/api/auth.ts`) |
| Deployment | Cloudflare Pages (`wrangler.toml`) |
| Match data | football-data.org API (`src/lib/football-data.ts`) |

## Directory structure

```
src/
  routes/                  # File-based routes (TanStack Router)
    _protected/            # Auth-gated user routes
      index.tsx            # Home / dashboard
      predictions.tsx      # Round predictions entry
      profile.tsx          # Profile, achievements, invite
      admin/
        index.tsx          # My groups list + create/join group
        $groupId.tsx       # Group detail: fixtures, share, standings drawer
    superadmin.tsx         # Super admin dashboard (stats, competitions, matches, users)
    login.tsx
    __root.tsx

  api/                     # Server functions (createServerFn)
    auth.ts                # Sign-in, sign-out, getMe
    fixtures.ts            # getFixtures (reads central table by competition + round)
    groups.ts              # getMyGroups, getGroup, createGroup, joinGroup, getAvailableLeagues
    leaderboard.ts         # getLeaderboard (per-group standings)
    predictions.ts         # getMyPredictions, getGroupPredictions, savePredictions,
                           #   copyPredictionsToMyGroups
    superadmin.ts          # getSuperAdminStats, getAllGroups, getAllUsers,
                           #   getEnabledCompetitions, setEnabledCompetitions,
                           #   getCompetitionFixtures, syncCompetition,
                           #   syncCompetitionSeason, setMatchResult, setActiveRound

  components/
    AppShell.tsx           # Layout shell + bottom nav (4 tabs: Home, Predict, Groups, Profile)
    TeamCrest.tsx          # SVG team badge by TLA code
    ThemeToggle.tsx        # Dark/light mode
    NoGroup.tsx            # Empty state when user has no groups

  db/
    schema.ts              # Drizzle schema (user, groups, groupMembers, fixtures,
                           #   predictions, config)
    client.ts              # getDb() — returns drizzle(env.DB)

  lib/
    football-data.ts       # fetchMatchday, fetchAllMatches, mapStatus, COMPETITION_CODES
    scoring.ts             # scoreFixture — awards points for a finished match
    leagues.ts             # getEnabledCompetitions, setEnabledCompetitions,
                           #   getCurrentRound, setCurrentRound (reads/writes config table)
    session.ts             # getSession() via Better Auth
    env-store.ts           # getEnvStore() — access Cloudflare env bindings

migrations/
  0000_init.sql            # Initial schema
  0001_central_matches.sql # Drops group-scoped fixtures; adds central fixtures +
                           #   predictions.group_id

wrangler.toml              # Cloudflare Pages config, D1 binding (DB → scoriq-db)
```

## Data model summary

- **`fixtures`** — Central, league-scoped. One row per match (`UNIQUE(competition, external_id)`). Owned by super admin; users never write here.
- **`predictions`** — Per user, per group, per fixture (`UNIQUE(group_id, fixture_id, user_id)`). Independent across groups even in the same league.
- **`groups`** — Each group picks one `competition`. Round is read from `config` key `current_round:<Competition>`, not stored on the group.
- **`config`** — Key/value store. Keys: `enabled_competitions` (JSON array), `current_round:<Competition>` (integer string).

## Key conventions

- `requireUser()` / `requireSuperAdmin()` are called at the top of every server function that needs auth. Super admin is identified by `SUPER_ADMIN_EMAIL` env var.
- Migrations are hand-written SQL files applied via `npx wrangler d1 execute scoriq-db --local --file=./migrations/<file>.sql` (local) or `--remote` (production).
- No automated cron in Cloudflare Pages — the super admin uses the manual "Sync all" button in the Competitions tab to pull matches from football-data.org.
- The bottom nav uses `z-50`; any fixed overlay (modals, drawers) must use `z-40` or higher but be positioned above the nav height (~100px from bottom).
