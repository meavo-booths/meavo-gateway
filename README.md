# Meavo Gateway

Company tools dashboard for [meavo.app](https://meavo.app). Users sign in and open the apps they have access to (e.g. Vacation Tracker at hols.meavo.app).

Gateway is the **source of truth** for users, teams, and tool access. [Vacation Tracker](https://github.com/meavo-stack/hols) connects to the **same Neon database** for shared users and teams.

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
   - `ADMIN_PASSWORD` (for initial seed only)
   - `BLOB_READ_WRITE_TOKEN` — Vercel Blob (HR contract PDFs); create in Vercel Storage → Blob
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

## HR (confidential)

The `/hr` page is an employee database for users with **HR access** (separate from Admin).

- List all users; **Hire** converts a user to an employee (company, contract type, start date, role)
- Filter by user type, company (MEAVO/OA), contract (FTE/Freelance)
- Attach contract PDFs to employee profiles (stored in Vercel Blob)

Grant HR access when creating a user or via **Manage access** on the Admin users list.

After deploying HR schema changes, run `npm run db:push` from **either** repo against the shared Neon database (hols schema includes all tables). Do not push from gateway alone if the schema is missing vacation models.

**Important:** Gateway and hols share one database. Always use a schema that includes both gateway and hols models before `db:push`, or you risk dropping hols tables.

## Related apps

| App | Domain | Repo |
|-----|--------|------|
| Gateway | meavo.app | meavo-gateway |
| Vacation Tracker | hols.meavo.app | hols |
