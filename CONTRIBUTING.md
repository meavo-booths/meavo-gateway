# Contributing — meavo-gateway

## Before you open a PR

- [ ] Changes are scoped to the request — no drive-by refactors
- [ ] `npm run lint` passes
- [ ] No test suite — document manual verification steps in the PR
- [ ] Agent docs updated if you added routes, domain modules, crons, or auth rules (`AGENTS.md`, `docs/`, `.cursor/rules/`)
- [ ] Mutations that should email someone enqueue via `src/lib/notifications/enqueue.ts` (event registered in `event-catalog.ts` first)
- [ ] New pages checked at 375px and 1280px widths

## Branch naming

`feature/short-description`, `fix/short-description`, `docs/short-description`.

## Commit messages

Imperative mood, concise, focused on the why: `Add weekly holiday Slack digest cron`.

## Code placement

| Layer | Location |
|-------|----------|
| Pages / UI | `src/app/(app)/`, `src/components/` (kit in `ui.tsx`) |
| Mutations | Server Actions in `src/app/actions/` |
| Business logic + integrations | `src/lib/` (flat modules), `src/lib/notifications/` |
| Cron / streaming / auth routes | `src/app/api/` (each route enforces its own auth) |

## Cross-repo dependencies

- `@meavo/db` and `@meavo/navigation` are pinned to git tags in `package.json`. To bump: tag a release in the source repo, update the ref here, `npm install` (runs `prisma generate` via postinstall).
- Changes to org-wide conventions must also update `STANDARDS.md` in meavo-agent-templates and this repo's `AGENTS.md`.

## Schema changes

Only in [meavo-db](https://github.com/meavo-booths/meavo-db) — edit schema there, tag a release, bump the `@meavo/db` ref in every affected app. **Never `prisma db push` from this repo** (`npm run db:push` is disabled — one shared DB). For gateway-only tables when the schema lags, add an idempotent `scripts/*.sql` and apply with `prisma db execute` (see README).

## PR description

Include:

1. **What** changed (user-visible or API behaviour)
2. **Why** (link issue if any)
3. **How to verify** (commands or manual steps)
4. **Out of scope** (what you intentionally did not change)

## Agent-assisted PRs

If an AI agent wrote the code:

- Verify paths and business rules against `docs/domain.md`
- Reject leftover template placeholder comments in merged files
- Ensure no secrets in diff
