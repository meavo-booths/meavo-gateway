# Meavo Gateway

Company tools dashboard for [meavo.app](https://meavo.app). Users sign in and open the apps they have access to (e.g. Vacation Tracker at hols.meavo.app).

Separate from the [Vacation Tracker](https://github.com/meavo-stack/hols) repo — own database, own user accounts.

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

## Deploy to Vercel

1. Create a new GitHub repo `meavo-stack/meavo-gateway` and push this project.
2. Import the repo in Vercel → new project.
3. Add a **Neon Postgres** database (separate from hols).
4. Set environment variables:
   - `DATABASE_URL`
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_URL` — `https://meavo.app`
   - `ADMIN_EMAILS`
   - `ADMIN_PASSWORD` (for initial seed only)
5. **Connect a database** — in Vercel → your project → **Storage** → add **Neon Postgres** (this sets `DATABASE_URL`).

   If `awk -F= '/^DATABASE_URL=/{print length($2)}' .env.production.local` prints **2**, the value is `""` (empty). The Neon integration is linked but credentials were not injected. Fix:
   - Vercel → Storage → Neon → **Open in Neon Console** → copy the **pooled** connection string
   - Vercel → Settings → Environment Variables → set `DATABASE_URL` for Production + Preview
   - Re-run `vercel env pull .env.production.local --environment=production --yes`
   - Or paste into `.env.local` locally and run `npm run db:setup`

6. Deploy, then initialize the production database from your Mac:

```bash
vercel link
vercel env pull .env.production.local --environment=production
chmod +x scripts/setup-production-db.sh
npm run db:setup
```

`db:setup` checks that `DATABASE_URL` is not empty, writes it to `.env`, then runs `db:push` and `db:seed`.

6. Add domain **meavo.app** in Vercel → Settings → Domains.

## Admin

- **Users** — create accounts, assign teams, reset passwords
- **Tool cards** — name, description, URL; grant per-user access
- Seed creates a **Vacation Tracker** card linking to hols.meavo.app

## Related apps

| App | Domain | Repo |
|-----|--------|------|
| Gateway | meavo.app | meavo-gateway |
| Vacation Tracker | hols.meavo.app | hols |
