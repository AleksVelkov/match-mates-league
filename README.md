# ScorIQ

A football score-prediction game for friends. Create a group, pick a league, predict every match, and climb the standings.

Live at [scoriq.app](https://scoriq.app).

## Features

- **Groups** — create or join with an invite link/code; each group follows one league
- **Predictions** — enter a full-time score per match; auto-saved, locked at kickoff
- **Joker** — double the points on one match per round
- **Scoring** — exact score **5**, correct outcome **2**, wrong **0** (Joker ×2)
- **Standings & history** — per-group leaderboard, played rounds with every member's picks
- **Prediction visibility** — group owners choose whether picks are hidden until kickoff (default) or open
- **Team pages** — crest, standings, form, squad with photos and ages
- **Achievements** — unlocked from real results, with the match, score, group and date
- **Profile** — avatar upload, country, season stats, notifications, account deletion (GDPR)
- **Super admin** — enable leagues, sync fixtures/results, override scores, manage seasons, sync teams and players
- **Auth** — email/password or Google sign-in

## Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React, SSR via Nitro) |
| Router | TanStack Router (file-based, `src/routes/`) |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Hosting | Cloudflare Pages / Workers |
| Auth | Custom sessions in D1 (PBKDF2 passwords, Google OAuth) |
| Storage | DigitalOcean Spaces (avatars) |
| Styling | Tailwind CSS v4 |
| Match data | [football-data.org](https://www.football-data.org) |
| Player data | [API-Sports](https://api-sports.io) |

## Getting started

```bash
npm install
npm run db:migrate:local   # applies migrations 0000–0004
# then apply the newer migrations (see below)
npm run dev:wrangler       # runs the app with D1 bindings
```

`npm run dev` starts Vite only, without D1 — use `dev:wrangler` for anything that touches data.

### Environment variables

Set these as Cloudflare Pages environment variables (or in `.dev.vars` locally):

| Variable | Purpose |
|---|---|
| `SCORIQ_SECRET` | Application secret |
| `SUPER_ADMIN_EMAIL` | Email of the super admin account |
| `FOOTBALL_DATA_API_KEY` | football-data.org fixtures, results, teams |
| `API_SPORTS_KEY` | API-Sports player photos and ages |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `GOOGLE_REDIRECT_URI` | Must exactly match the redirect URI in Google Cloud Console, e.g. `https://scoriq.app/auth/callback/google` |
| `DO_SPACES_KEY` / `DO_SPACES_SECRET` | Avatar storage credentials |
| `DO_SPACES_BUCKET` / `DO_SPACES_ENDPOINT` / `DO_SPACES_REGION` | Bucket, e.g. `https://fra1.digitaloceanspaces.com`, `fra1` |

The D1 database binding is `DB` (`scoriq-db`), configured in `wrangler.toml`.

### Migrations

Hand-written SQL in `migrations/`, applied with Wrangler. The `db:migrate:*` scripts currently cover `0000`–`0004`; apply the rest manually:

```bash
npx wrangler d1 execute scoriq-db --local  --file=./migrations/0005_api_sports.sql
npx wrangler d1 execute scoriq-db --local  --file=./migrations/0006_group_settings.sql
npx wrangler d1 execute scoriq-db --local  --file=./migrations/0007_rate_limits.sql
```

Use `--remote` instead of `--local` for production. **Apply migrations before deploying code that depends on them.**

## Scripts

| Script | What it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Type-check, then production bundle |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run build:cf` | Build, then migrate the remote D1 database |

## How data flows

- **Fixtures are central.** The super admin syncs matches from football-data.org once per league; every group in that league shares them. Users never write fixtures.
- **Predictions are per group.** The same user can predict the same match differently in different groups.
- **Rounds are per league**, stored in the `config` table as `current_round:<League>`.
- Scoring runs when a match is finished (on sync, or via a manual result override by the super admin).

## Project layout

```
src/
  routes/       File-based routes (_protected/ is auth-gated)
  api/          Server functions (createServerFn)
  components/   Shared UI (AppShell, TeamCrest, LeagueCrest, EmojiPicker, ...)
  db/           Drizzle schema + client
  lib/          Scoring, sessions, rate limiting, football-data / API-Sports clients
migrations/     D1 SQL migrations
```

## Security notes

- Passwords hashed with PBKDF2-SHA256 (600k iterations); legacy hashes upgrade on login
- Rate limiting on sign-in, sign-up, OAuth and group joins (D1-backed)
- Avatar uploads are validated server-side (type allowlist, magic bytes, 5 MB cap)
- Google sign-in requires a verified email

## License

Private project. All rights reserved.
