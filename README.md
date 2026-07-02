# Meavo Gateway

Company tools dashboard for [meavo.app](https://meavo.app). Users sign in and open the apps they have access to (e.g. Vacation Tracker at hols.meavo.app).

Gateway is the **source of truth** for users, teams, and tool access. [Vacation Tracker](https://github.com/meavo-booths/hols) connects to the **same Neon database** for shared users and teams.

## Shared database

Both apps use one Postgres database (gateway's Neon):

| App | Manages in DB |
|-----|----------------|
| **meavo-gateway** | Users, teams, tool cards, access |
| **hols** | Vacation requests, allowance overrides (reads users/teams) |

On Vercel, set **hols** `DATABASE_URL` to the **same value** as gateway.

After pointing hols at the gateway database, run once from the hols repo:

```bash
npm run db:push
```

That adds vacation-specific tables (`VacationRequest`, `UserAllowance`, etc.) to the shared database.

## Local setup

```bash
cp .env.example .env
# Edit DATABASE_URL, AUTH_SECRET, ADMIN_EMAILS, ADMIN_PASSWORD

npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For local hols dev, use the same `DATABASE_URL` in hols `.env`, then `npm run db:push` in hols.

## Deploy to Vercel

1. Import the repo in Vercel → new project.
2. Add **Neon Postgres** (this database is shared with hols).
3. Set environment variables:
   - `DATABASE_URL`
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_URL` — `https://meavo.app`
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

5. Add domain **meavo.app** in Vercel → Settings → Domains.
6. Point **hols** `DATABASE_URL` at this same Neon connection string (see hols README).

## Admin

- **Users** — create accounts, assign teams, reset passwords, grant Admin / HR access
- **Teams** — name, colour, yearly allowance (days)
- **Tool cards** — grant access; Vacation Tracker card controls hols login
- **Notifications** — recent email delivery log (processed by gateway cron)

## Email notifications

Gateway owns the notification **outbox** and sends email via Resend. Hols and assembly enqueue events into the same database; a Vercel Cron job on gateway (`/api/cron/process-notifications`, every 5 minutes) delivers them.

Phase 1 events: vacation request/approve/reject (hols), questionnaire submitted (assembly), user created and employee hired/contract ended (gateway). Admins can enable or disable each event under **Admin → Notifications**.

Satellite apps only need `DATABASE_URL` — no `RESEND_API_KEY` on hols or assembly.

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

Gateway, hols, and assembly share one Neon database. The gateway `prisma/schema.prisma` may be **behind** the assembly repo (fewer questionnaire models). A full `npm run db:push` from gateway can try to **drop** assembly tables — Prisma will warn about data loss. Use the targeted SQL script instead:

```bash
cd meavo-gateway
npx prisma db execute --file scripts/add-gateway-sheet-record.sql --schema prisma/schema.prisma
```

`SheetImportState` already exists (assembly uses id `"default"`; gateway uses `"gateway"`).

If your local schema includes **all** app models and `db:push` shows no destructive changes, `npm run db:push` is also fine.

## Weekly holiday Slack digest

Every **Monday at 07:00 UTC** (~09:00 Sofia in winter), gateway posts approved leave for the current calendar week to a Slack channel.

1. In Slack: **Apps → Incoming Webhooks** (or create a Slack app with an incoming webhook) and copy the webhook URL for your target channel.
2. Set `SLACK_HOLIDAY_DIGEST_WEBHOOK_URL` on the gateway Vercel project.
3. Deploy so `vercel.json` registers the cron (`/api/cron/weekly-holiday-slack`).

Manual test (after deploy):

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://meavo.app/api/cron/weekly-holiday-slack"
```

The message lists **approved** vacation requests that overlap the current week (Mon–Sun in `HOLIDAY_DIGEST_TIMEZONE`), with employee name, team, dates, and duration.

After adding notification tables, run the targeted SQL script (safe when gateway schema lags assembly/hols):

```bash
npx prisma db execute --file scripts/add-notification-tables.sql --schema prisma/schema.prisma
```

Do **not** run a full `db:push` from gateway alone if the schema is missing assembly models.

## HR (confidential)

The `/hr` page is an employee database for users with **HR access** (separate from Admin).

- List all users; **Hire** converts a user to an employee (company, contract type, start date, role)
- **Edit** employee company, contract, start date, and role after hiring
- **End contract** with a past or future end date; past dates mark the employee as a past employee
- Filter by user type, status (active/past), company (MEAVO/OA), and contract (FTE/Freelance) — filters support multiple selections; default view filters to active status only
- Attach contract PDFs to employee profiles (stored in Vercel Blob)

Grant HR access when creating a user or via **Manage access** on the Admin users list. Only users whose emails are listed in `HR_ACCESS_GRANTOR_EMAIL` (comma-separated) see the HR checkbox and can change HR access.

After deploying HR schema changes, run `npm run db:push` from **either** repo against the shared Neon database (hols schema includes all tables). Do not push from gateway alone if the schema is missing vacation models.

**Important:** Gateway, hols, and assembly share one database. Always use a schema that includes **all** app models (gateway + hols + assembly) before `db:push`, or you risk dropping tables from the other apps.

## Related apps

| App | Domain | Repo |
|-----|--------|------|
| Gateway | [meavo.app](https://meavo.app) | [meavo-booths/meavo-gateway](https://github.com/meavo-booths/meavo-gateway) |
| Vacation Tracker | [hols.meavo.app](https://hols.meavo.app) | [meavo-booths/hols](https://github.com/meavo-booths/hols) |
| Assembly | [assembly.meavo.app](https://assembly.meavo.app) | [meavo-booths/assembly](https://github.com/meavo-booths/assembly) |
