# Architecture — meavo-gateway

Company tools dashboard at [meavo.app](https://meavo.app) and the **source of truth for identity** across all Meavo apps: users, teams, tool cards, and access grants. Also hosts HR (employee database, contracts, document templates), the library (culture hub, market dashboard, revenue), the notifications outbox processor, and the Ops File Google Sheets import.

**Further reading:**
- [domain.md](domain.md) — business rules, personas, mutation map
- [data-model.md](data-model.md) — gateway-owned database tables
- [AGENTS.md](../AGENTS.md) — org-wide Meavo app development guide (gateway is the reference implementation)

## Sibling repos (meavo-booths)

| Repo | Relationship |
|------|----------------|
| [meavo-db](https://github.com/meavo-booths/meavo-db) | Canonical Prisma schema — the **only** repo allowed to alter DB structure; consumed here as `@meavo/db` |
| [meavo-navigation](https://github.com/meavo-booths/meavo-navigation) | Shared top nav + tool switcher; gateway serves the tool card data satellites read |
| [hols](https://github.com/meavo-booths/hols) | Vacation Tracker — gateway reads `VacationRequest` for the weekly Slack digest and notifications |
| assembly, meavo-sales, meavo-mrp, Meavo-Factory, meavo-rp, meavo-clock, meavo-tasks | Satellite apps — their logins are gated by `ToolCardAccess` rows that gateway Admin manages; they enqueue into `NotificationOutbox` which gateway delivers |

## Stack decisions

- **Next.js 15 App Router + React 19 + TypeScript strict** — org standard; Server Components by default, Server Actions for mutations.
- **Prisma 6 via `@meavo/db`** — one shared Neon Postgres for the whole ecosystem; schema changes only in meavo-db (`db:push` disabled here).
- **NextAuth v5, JWT sessions** — Credentials (bcryptjs, 12 rounds, login throttling) plus invite-only Google. `ADMIN_EMAILS` auto-promotes admins on login.
- **Vercel** — hosting, cron, Blob storage (HR contract PDFs, generated documents, library HTML assets).
- **Resend** — gateway is the only Meavo app that sends email; everything else enqueues.
- **googleapis** — Ops File sheet import via service account. **Slack webhook** — weekly holiday digest. **pdf-lib** — HR document generation. **recharts** — revenue charts.

## Repository layout

```
src/
├── app/
│   ├── (app)/            # authenticated routes: home, admin/, hr/, library/, profile/
│   ├── login/            # public login
│   ├── actions/          # Server Actions (admin, hr, library, profile, auth, sheet-import, ...)
│   └── api/              # auth/[...nextauth], cron/, health/, hr/ + library/ file streaming
├── components/           # ui.tsx kit, modal.tsx, nav.tsx, feature components
├── lib/                  # domain modules (flat), notifications/, auth, prisma singleton
├── middleware.ts         # page-level auth gate (passes /api/* through)
└── types/                # next-auth session augmentation
prisma/seed.ts            # admin user + default tool cards
scripts/                  # idempotent targeted SQL migrations + seed/setup scripts
```

## Data flow

```
Browser
  → Server Component page (src/app/(app)/...)
  → Server Action (src/app/actions/...)          ← auth guard + permission check
  → src/lib/ domain module → Prisma → Neon Postgres (shared)
  → side effects (fire-and-forget):
      enqueueNotification() → NotificationOutbox ─┐
                                                  ├→ cron process-notifications → Resend
      satellite apps enqueue into the same table ─┘
      Vercel Blob            ← uploads (HR PDFs, library assets)
      Google Sheets          → cron import-sheet → GatewaySheetRecord → revenue dashboard
      VacationRequest (hols) → cron weekly-holiday-slack → Slack webhook
```

## API surface

- **Server Actions** (`src/app/actions/`) — all mutations: admin (users/teams/tool cards), HR, document templates, library, profile, auth, sheet import.
- **Route handlers** (`src/app/api/`) — NextAuth (`auth/[...nextauth]`), health check (`health`), authenticated file streaming (`hr/documents`, `hr/generated-documents`, `library/assets`), and cron routes below. Every route enforces its own auth.

## Scheduled jobs (`vercel.json`)

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/process-notifications` | every 5 min | Deliver `NotificationOutbox` emails via Resend |
| `/api/cron/weekly-holiday-slack` | Mon 07:00 UTC | Post approved leave for the week to Slack |
| `/api/cron/import-sheet` | every 30 min | Import Ops File sheet into `GatewaySheetRecord` |

All protected by `CRON_SECRET` Bearer auth (`src/lib/cron-auth.ts`).

## Environment variables

Document names only (see `.env.example` and README for the full deploy list):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Shared Neon Postgres (same value for every Meavo app) |
| `AUTH_SECRET`, `AUTH_URL` | NextAuth |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Optional invite-only Google sign-in |
| `ADMIN_EMAILS`, `ADMIN_PASSWORD` | Admin bootstrap (password used by seed only) |
| `HR_ACCESS_GRANTOR_EMAIL` | Who can grant/revoke HR access |
| `MARKETING_TEAM_ID` | Team allowed to upload the Market Dashboard |
| `MEAVO_APP_KEY`, `GATEWAY_URL` | `@meavo/navigation` tool switcher |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_DEV_OVERRIDE` | Email delivery |
| `CRON_SECRET` | Protects `/api/cron/*` |
| `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_TAB_NAME` | Sheet import |
| `SLACK_HOLIDAY_DIGEST_WEBHOOK_URL`, `HOLIDAY_DIGEST_TIMEZONE`, `HOLIDAY_DIGEST_ENABLED` | Weekly Slack digest |

## Deployment

Vercel project on domain `meavo.app`; crons registered via `vercel.json`. Production DB init: `npm run db:setup` (applies the installed `@meavo/db` schema, then seeds). Post-deploy smoke: `scripts/post-migration-smoke.sh`.
