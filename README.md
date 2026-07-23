# Meavo Gateway

Company tools dashboard for [meavo.app](https://meavo.app). Users sign in and open the apps they have access to (e.g. Vacation Tracker at hols.meavo.app).

Gateway is the **source of truth** for users, teams, and tool access. All Meavo apps connect to the **same Neon database** for shared users, teams, and tool card access.

For patterns when building or extending Meavo apps, see **[AGENTS.md](./AGENTS.md)**.

## Documentation

| Doc | Contents |
|-----|----------|
| [AGENTS.md](./AGENTS.md) | Org-wide Meavo app development guide (gateway is the reference implementation) |
| [docs/architecture.md](./docs/architecture.md) | Stack, sibling repos, repository layout, data flow, crons, env vars |
| [docs/domain.md](./docs/domain.md) | Business rules, roles/personas, mutation map |
| [docs/data-model.md](./docs/data-model.md) | Gateway-owned database tables (schema lives in meavo-db) |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | PR process, code placement, schema-change workflow |
| `.cursor/rules/` | Always-on agent rules: core stack, security, UI, domain, API |

## Shared database

All apps use one Postgres database (Neon). The canonical Prisma schema lives in **[meavo-db](https://github.com/meavo-booths/meavo-db)** — that is the **only** repo allowed to alter database structure. App repos consume `@meavo/db` and run `prisma generate` only; `npm run db:push` is disabled in gateway to prevent accidental drops of other apps' tables.

| App | Domain | Manages in DB |
|-----|--------|----------------|
| **meavo-gateway** | meavo.app | Users, teams, tool cards, access, HR, notifications, sheet import |
| **hols** | hols.meavo.app | Vacation requests, allowances, public holidays |
| **assembly** | assembly.meavo.app | Questionnaires, submissions |
| **sales** | sales.meavo.app | Deals, clients, products |
| **mrp** | mrp.meavo.app | Materials, stock movements |
| **factory** | factory.meavo.app | Production batches, stations |
| **rp** | rp.meavo.app | RP-specific data |

On Vercel, set each app's `DATABASE_URL` to the **same value** as gateway.

### Schema changes

1. Edit `prisma/schema.prisma` in [meavo-db](https://github.com/meavo-booths/meavo-db).
2. Tag a release and bump `@meavo/db` in affected apps.
3. Apply to a database from the canonical schema:

```bash
npx prisma db push --schema node_modules/@meavo/db/prisma/schema.prisma
```

For gateway-only tables when the installed schema lags, use targeted SQL in `scripts/*.sql` (see below).

## Local setup

```bash
cp .env.example .env
# Edit DATABASE_URL, AUTH_SECRET, ADMIN_EMAILS, ADMIN_PASSWORD

npm install
npx prisma db push --schema node_modules/@meavo/db/prisma/schema.prisma
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For local hols dev, use the same `DATABASE_URL` in hols `.env`. Schema changes go through meavo-db — do not run `db:push` from individual app repos unless you are working in the meavo-db repo itself.

## Deploy to Vercel

1. Import the repo in Vercel → new project.
2. Add **Neon Postgres** (this database is shared with all Meavo apps).
3. Set environment variables:
   - `DATABASE_URL`
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_URL` — `https://meavo.app`
   - `MEAVO_APP_KEY` — `gateway`
   - `GATEWAY_URL` — `https://meavo.app`
   - `ADMIN_EMAILS`
   - `HR_ACCESS_GRANTOR_EMAIL` — comma-separated emails; only these users can grant or revoke HR access in Admin
   - `ADMIN_PASSWORD` (for initial seed only)
   - `BLOB_READ_WRITE_TOKEN` — Vercel Blob (HR contract PDFs); create in Vercel Storage → Blob
   - `RESEND_API_KEY` — [Resend](https://resend.com) API key for email notifications
   - `EMAIL_FROM` — e.g. `MEAVO <notifications@meavo.app>` (domain must be verified in Resend)
   - `CRON_SECRET` — protects `/api/cron/*` routes (Vercel Cron)
   - `GOOGLE_SERVICE_ACCOUNT_JSON` — service account JSON for Google Sheets import (same credential as assembly; share each sheet with its `client_email` as Viewer)
   - `GOOGLE_SHEETS_SPREADSHEET_ID` — spreadsheet ID for gateway sheet import
   - `GOOGLE_SHEETS_TAB_NAME` — tab name to import (default `Sheet1`)
   - `SLACK_HOLIDAY_DIGEST_WEBHOOK_URL` — Slack incoming webhook for the weekly holiday digest (see below)
   - `HOLIDAY_DIGEST_TIMEZONE` (optional) — week boundaries and date labels; default `Europe/Sofia`
   - `HOLIDAY_DIGEST_ENABLED` (optional) — set to `false` to disable the weekly Slack digest without removing the cron
   - `EMAIL_DEV_OVERRIDE` (optional) — redirect all notification emails in development
4. Deploy, then initialize the production database:

```bash
vercel link
vercel env pull .env.production.local --environment=production
chmod +x scripts/setup-production-db.sh
npm run db:setup
```

`db:setup` runs `prisma db push` against the installed `@meavo/db` schema, then seeds admin and tool cards.

5. Add domain **meavo.app** in Vercel → Settings → Domains.
6. Point every satellite app's `DATABASE_URL` at this same Neon connection string.

## Admin

- **Users** — create accounts, assign teams, reset passwords, grant Admin / HR access
- **Teams** — name, colour, yearly allowance (days)
- **Tool cards** — grant access; APP_ACCESS cards control satellite app login
- **Notifications** — recent email delivery log (processed by gateway cron)

## Email notifications

Gateway owns the notification **outbox** and sends email via Resend. Satellite apps enqueue events into the same database; a Vercel Cron job on gateway (`/api/cron/process-notifications`, every 5 minutes) delivers them.

Phase 1 events: vacation request/approve/reject (hols), questionnaire submitted (assembly), user created and employee hired/contract ended (gateway). Admins can enable or disable each event under **Admin → Notifications**.

Satellite apps only need `DATABASE_URL` — no `RESEND_API_KEY`. Copy `src/lib/notifications/enqueue.ts` from assembly into each app that sends notifications (see AGENTS.md §10).

## Google Sheets import

Gateway imports the **Ops File** Google Sheet into `GatewaySheetRecord` (JSON per row). Reuse the **same service account** as assembly:

1. Share the sheet with the service account `client_email` from `GOOGLE_SERVICE_ACCOUNT_JSON` as **Viewer**
2. On the gateway Vercel project, set `GOOGLE_SERVICE_ACCOUNT_JSON` (same value as assembly), `GOOGLE_SHEETS_SPREADSHEET_ID`, and `GOOGLE_SHEETS_TAB_NAME`
3. Deploy so `vercel.json` registers the cron (`/api/cron/import-sheet`, every 30 minutes)

Admins can monitor status and trigger a manual import under **Admin → Sheet imports**. The Ops File uses row 1 as headers; DealID is the unique key. Revenue, invoice date, and sales rep power the home page revenue card.

Manual test (after deploy):

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://meavo.app/api/cron/import-sheet"
```

### Database migration (`GatewaySheetRecord`)

Use the targeted SQL script when adding gateway-only tables:

```bash
cd meavo-gateway
npx prisma db execute --file scripts/add-gateway-sheet-record.sql \
  --schema node_modules/@meavo/db/prisma/schema.prisma
```

`SheetImportState` already exists (assembly uses id `"default"`; gateway uses `"gateway"`).

## Weekly holiday Slack digest

Every **Monday at 07:00 UTC** (~09:00 Sofia in winter), gateway posts approved leave and public holidays for the current calendar week to a Slack channel.

1. In Slack: **Apps → Incoming Webhooks** (or create a Slack app with an incoming webhook) and copy the webhook URL for your target channel.
2. Set `SLACK_HOLIDAY_DIGEST_WEBHOOK_URL` on the gateway Vercel project.
3. Deploy so `vercel.json` registers the cron (`/api/cron/weekly-holiday-slack`).

Manual test (after deploy):

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://meavo.app/api/cron/weekly-holiday-slack"
```

The message lists **approved** vacation requests that overlap the current week (Mon–Sun in `HOLIDAY_DIGEST_TIMEZONE`), with employee name, team, dates, and duration. It also lists **public holidays** for that week for every country where at least one user has `holidayCountryCode` set (from the shared `PublicHoliday` cache warmed by hols).

After adding notification tables, run the targeted SQL script:

```bash
npx prisma db execute --file scripts/add-notification-tables.sql \
  --schema node_modules/@meavo/db/prisma/schema.prisma
```

## HR (confidential)

The `/hr` page is an employee database for users with **HR access** (separate from Admin).

- List all users; **Hire** converts a user to an employee (company, contract type, start date, role)
- **Edit** employee company, contract, start date, and role after hiring
- **End contract** with a past or future end date; past dates mark the employee as a past employee
- Filter by user type, status (active/past), company (MEAVO/OA), and contract (FTE/Freelance) — filters support multiple selections; default view filters to active status only
- Attach contract PDFs to employee profiles (stored in Vercel Blob)

Grant HR access when creating a user or via **Manage access** on the Admin users list. Only users whose emails are listed in `HR_ACCESS_GRANTOR_EMAIL` (comma-separated) see the HR checkbox and can change HR access.

HR schema changes go through [meavo-db](https://github.com/meavo-booths/meavo-db) — apply with `npx prisma db push --schema node_modules/@meavo/db/prisma/schema.prisma` after bumping the dependency.

## Related apps

| App | Domain | Repo |
|-----|--------|------|
| Gateway | [meavo.app](https://meavo.app) | [meavo-booths/meavo-gateway](https://github.com/meavo-booths/meavo-gateway) |
| Vacation Tracker | [hols.meavo.app](https://hols.meavo.app) | [meavo-booths/hols](https://github.com/meavo-booths/hols) |
| Assembly | [assembly.meavo.app](https://assembly.meavo.app) | [meavo-booths/assembly](https://github.com/meavo-booths/assembly) |
| Sales | [sales.meavo.app](https://sales.meavo.app) | [meavo-booths/meavo-sales](https://github.com/meavo-booths/meavo-sales) |
| MRP | [mrp.meavo.app](https://mrp.meavo.app) | [meavo-booths/meavo-mrp](https://github.com/meavo-booths/meavo-mrp) |
| Factory | [factory.meavo.app](https://factory.meavo.app) | [meavo-booths/Meavo-Factory](https://github.com/meavo-booths/Meavo-Factory) |
| Schema | — | [meavo-booths/meavo-db](https://github.com/meavo-booths/meavo-db) |
| Navigation | — | [meavo-booths/meavo-navigation](https://github.com/meavo-booths/meavo-navigation) |
