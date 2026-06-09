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

- **Users** — create accounts, assign teams, reset passwords
- **Teams** — name, colour, yearly allowance (days)
- **Tool cards** — grant access; Vacation Tracker card controls hols login

## Related apps

| App | Domain | Repo |
|-----|--------|------|
| Gateway | meavo.app | meavo-gateway |
| Vacation Tracker | hols.meavo.app | hols |
