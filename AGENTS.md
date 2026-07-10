# Meavo App Development Guide (for AI Agents)

This document describes how to build a **new Meavo web app** that fits the existing ecosystem. Use **meavo-gateway** (`meavo.app`) as the reference implementation. Read neighboring files before adding code — match existing patterns with minimal diffs.

---

## 1. Ecosystem overview

Meavo is a set of internal company tools, each deployed as its own Next.js app on Vercel, all sharing **one Neon Postgres database**.

| App | Domain | Owns in DB |
|-----|--------|------------|
| **Gateway** | `meavo.app` | Users, teams, tool cards, access, HR, notifications outbox, sheet import |
| **Hols** | `hols.meavo.app` | Vacation requests, allowances, public holidays |
| **Assembly** | `assembly.meavo.app` | Questionnaires, submissions |
| **Sales** | `sales.meavo.app` | Deals, clients, products |
| **MRP** | `mrp.meavo.app` | Materials, stock movements |
| **Factory** | `factory.meavo.app` | Production batches, stations |
| **RP** | `rp.meavo.app` | RP-specific data |
| **Clock** | `clock.meavo.app` | Clock-in / time tracking |

**Gateway is the source of truth** for identity (users, teams, permissions). Satellite apps read shared tables and write only their own domain tables.

The hols repo is [meavo-booths/hols](https://github.com/meavo-booths/hols) (domain `hols.meavo.app`).

Shared packages:

| Package | Purpose |
|---------|---------|
| `@meavo/db` | Canonical Prisma schema for **all** apps ([meavo-booths/meavo-db](https://github.com/meavo-booths/meavo-db)) |
| `@meavo/navigation` | Shared top nav + tool switcher across apps |

---

## 2. Tech stack (required)

Every new Meavo app should use:

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 15+** (App Router) |
| Language | **TypeScript** (strict) |
| UI | **React 19** |
| Styling | **Tailwind CSS 3** — no shadcn, Radix, or MUI unless explicitly approved |
| ORM | **Prisma 6** via `@meavo/db` |
| Database | **PostgreSQL** (Neon) — same `DATABASE_URL` as gateway |
| Auth | **NextAuth v5** (Auth.js) with JWT sessions |
| Passwords | **bcryptjs** (12 rounds) |
| Hosting | **Vercel** |
| Analytics | **@vercel/analytics** + **@vercel/speed-insights** (optional but used in gateway) |
| File storage | **Vercel Blob** (when uploads are needed) |
| Email | **Resend** — only gateway sends; satellite apps **enqueue** only |

Do **not** introduce a separate backend service, GraphQL, tRPC, or a different ORM unless there is an explicit architectural decision to do so.

---

## 3. Project structure

Each app is a **single Next.js repo** (not a monorepo). Follow this layout:

```
my-app/
├── src/
│   ├── app/
│   │   ├── (app)/              # Authenticated routes (route group)
│   │   │   ├── layout.tsx      # Nav + main container
│   │   │   ├── page.tsx        # Home / main view
│   │   │   └── [feature]/      # Feature sections
│   │   ├── login/              # Public login
│   │   ├── actions/            # Server Actions ("use server")
│   │   ├── api/                # Route handlers (cron, health, file streaming, auth)
│   │   ├── layout.tsx          # Root layout (metadata, globals)
│   │   └── globals.css
│   ├── components/             # React components (UI kit + feature)
│   ├── lib/                    # Domain logic, auth, integrations
│   ├── middleware.ts           # Auth gate for pages
│   └── types/                  # Type augmentations (e.g. next-auth.d.ts)
├── prisma/
│   └── seed.ts                 # Local seed (optional)
├── scripts/                    # Targeted SQL migrations, setup scripts
├── public/                     # Static assets
├── package.json
├── tailwind.config.ts
├── next.config.ts
├── vercel.json                 # Cron schedules (if needed)
└── .env.example
```

Path alias: `@/*` → `./src/*`.

**Prisma schema location** — always point at the shared package:

```json
"prisma": {
  "schema": "node_modules/@meavo/db/prisma/schema.prisma"
}
```

Pin `@meavo/db` to a tagged release in `package.json` (check [meavo-booths/meavo-db](https://github.com/meavo-booths/meavo-db) for the latest tag):

```json
"@meavo/db": "github:meavo-booths/meavo-db#v0.3.1"
```

---

## 4. Architecture patterns

### 4.1 Server-first rendering

- **Default to Server Components** for pages, layouts, and data fetching.
- Use `"use client"` only for interactive UI: forms with `useActionState`, nav tabs, modals, charts, filters.
- Pattern: server page fetches data → passes props to small client components.

### 4.2 Mutations via Server Actions

Primary mutation pattern is **Server Actions** in `src/app/actions/`, not REST endpoints.

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export type ActionResult = { error?: string };

async function requireAccess() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  // add app-specific permission checks
  return session.user;
}

export async function createThing(formData: FormData): Promise<ActionResult> {
  await requireAccess();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required." };

  // ... prisma mutation

  revalidatePath("/things");
  return {};
}
```

**Conventions:**
- Return `{ error?: string }` for validation failures — do not throw to the client for user-facing errors.
- Call `revalidatePath()` after mutations.
- Parse `FormData` manually (no Zod unless the app already uses it).
- Fire-and-forget side effects (notifications) with `.catch(console.error)`.

### 4.3 Route handlers (use sparingly)

Add `src/app/api/**` route handlers only when Server Actions are insufficient:

| Use case | Example |
|----------|---------|
| Vercel Cron jobs | `/api/cron/process-notifications` |
| Health checks | `/api/health` |
| File streaming | `/api/hr/documents/[id]` |
| NextAuth | `/api/auth/[...nextauth]` |

Each API route must enforce its **own auth** — middleware does not protect `/api/*`.

Cron routes use Bearer token auth:

```typescript
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}
```

### 4.4 Dynamic rendering

Authenticated layouts and any page that queries/writes the DB at request time must use:

```typescript
export const dynamic = "force-dynamic";
```

This prevents `next build` from prerendering against the production database.

For cacheable read-only pages, `export const revalidate = 300` is acceptable (see gateway home page).

### 4.5 Prisma client singleton

```typescript
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

## 5. UI and design system

### 5.1 No external component library

Build a small in-house UI kit in `src/components/ui.tsx`. Reuse these components everywhere:

| Component | Purpose |
|-----------|---------|
| `Card` | White container with border, shadow, `rounded-xl` |
| `Button` | Variants: `primary`, `secondary`, `danger`, `ghost` |
| `Input`, `Textarea`, `Select` | Form fields with label |
| `PageHeader` | Page title + description + optional actions |

Do not add shadcn/Radix/MUI for a new app unless explicitly requested.

### 5.2 Color palette and typography

**Brand green** (primary actions):

```
brand-500/600: #30A46C
brand-700:       #0C8F61
brand-50/100:    light green backgrounds
```

**Neutrals:** Tailwind `slate` scale for text, borders, backgrounds.

**CSS variables** (`globals.css`):

```css
:root {
  --background: #f8fafc;
  --foreground: #0f172a;
}
```

**Team colors:** default `#EEDCDC` for culture/company headers. Teams have configurable hex colors in the DB.

### 5.3 Layout conventions

**Authenticated shell** (`src/app/(app)/layout.tsx`):

```tsx
<>
  <Nav />
  <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">{children}</main>
</>
```

**Login page:** centered card, max-width `md`, logo at top, slate helper text.

**Section layouts** (admin, hr, etc.): `PageHeader` + horizontal tab nav + content.

**Section tab nav** pattern (client component):

```tsx
<nav className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
  {/* active tab: bg-white text-brand-700 shadow-sm */}
  {/* inactive tab: text-slate-600 hover:text-slate-900 */}
</nav>
```

### 5.4 Visual rules

| Element | Style |
|---------|-------|
| Cards | `rounded-xl border border-slate-200 bg-white shadow-sm` |
| Inputs/buttons | `rounded-lg` |
| Page titles | `text-xl sm:text-2xl font-semibold text-slate-900` |
| Body text | `text-sm text-slate-600` |
| Errors | `text-sm text-red-600` |
| Grids | `grid gap-6 sm:grid-cols-2 lg:grid-cols-3` for card tiles |
| Responsive | Mobile-first; use `sm:` and `lg:` breakpoints |

Primary buttons use `bg-brand-600 hover:bg-brand-700`. Focus rings use `focus:ring-brand-100 focus:border-brand-500`.

### 5.5 Modals

Use the accessible custom modal pattern (`src/components/modal.tsx` in gateway): focus trap, Escape to close, `role="dialog"`.

### 5.6 Loading states

Add `loading.tsx` skeletons in feature route folders. Use animated `animate-pulse` slate blocks matching the page layout.

### 5.7 Navigation

Use `@meavo/navigation` for the top nav bar and tool switcher:

```tsx
import { MeavoNavBar } from "@meavo/navigation";
import { getAccessibleTools, resolveCurrentToolId } from "@meavo/navigation/server";
```

Set env vars:
- `MEAVO_APP_KEY` — your app's `linkedAppKey` (e.g. `hols`, `assembly`, `sales`)
- `GATEWAY_URL` — `https://meavo.app`

Filter nav links by permission (`adminOnly`, `hrOnly`, etc.) server-side before passing to `MeavoNavBar`.

Add `@meavo/navigation` to `tailwind.config.ts` `content` so Tailwind picks up nav classes:

```typescript
content: [
  "./src/**/*.{js,ts,jsx,tsx,mdx}",
  "./node_modules/@meavo/navigation/dist/**/*.js",
],
```

When registering a **new** app, you must also update the `@meavo/navigation` package — see §9.3.

---

## 6. Authentication

### 6.1 NextAuth setup

- **JWT session strategy** (not database sessions).
- **Credentials provider (gateway, hols):** email + bcrypt `passwordHash` on `User`.
- **Google provider (optional):** invite-only — user must already exist in DB. Hide the button when `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` are unset. Some satellite apps are **Google-only** today (e.g. sales).

Extend the session in `src/types/next-auth.d.ts`:

```typescript
interface Session {
  user: {
    id: string;
    systemRole: SystemRole;
    hrAccess: boolean;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}
```

Refresh `systemRole` and `hrAccess` from DB in the JWT callback on each request.

### 6.2 Admin bootstrap

Emails in `ADMIN_EMAILS` (comma-separated) auto-promote to `SystemRole.ADMIN` on login.

### 6.3 Login throttle

Gateway implements login throttling (10 failures / 15 min). New apps handling credentials login should follow the same pattern using the shared `LoginThrottle` table.

### 6.4 Middleware

Page-level auth gate in `src/middleware.ts`:

- Unauthenticated users → redirect to `/login`
- Authenticated users on `/login` → redirect to `/`
- **Pass through** `/api/*` and static assets

Each API route and Server Action must still verify permissions independently.

### 6.5 Satellite app login gating

Satellite apps (hols, assembly, sales, etc.) must check **tool card access** at login **and** on ongoing requests so revoking access in gateway Admin takes effect immediately (not only when the JWT expires).

#### Tool card ID (not runtime `linkedAppKey` lookup)

Each app stores the gateway seed card ID in an env var or constant — matching `defaultCardId` in gateway's `src/lib/tool-card-registry.ts`:

| App | Env var | Default |
|-----|---------|---------|
| hols | `VACATION_TRACKER_CARD_ID` (hols repo) | `seed-vacation-tracker` |
| assembly | `ASSEMBLY_TOOL_CARD_ID` | `seed-assembly-tool` |
| sales | `SALES_TOOL_CARD_ID` | `seed-sales-tool` |
| mrp | `MRP_TOOL_CARD_ID` | `seed-mrp-tool` |

```typescript
// src/lib/constants.ts
export const MYAPP_TOOL_CARD_ID =
  process.env.MYAPP_TOOL_CARD_ID ?? "seed-myapp-tool";
```

Do **not** look up the card by `linkedAppKey` at runtime — use the stable seed ID from the registry.

#### Check access at login and on every request

1. **At login** (credentials `authorize` or Google `signIn` validate): reject if no `ToolCardAccess` row for `{ userId, cardId: MYAPP_TOOL_CARD_ID }`.
2. **On every authenticated request** (layouts, actions, API routes): re-check access. Hols implements this in `getHolsUser()` — replicate that pattern in a `requireMyAppAccess()` helper.

```typescript
const access = await prisma.toolCardAccess.findUnique({
  where: {
    userId_cardId: { userId: session.user.id, cardId: MYAPP_TOOL_CARD_ID },
  },
});
if (!access) redirect("/login?error=NoAccess");
```

#### Admin bypass (inconsistent today — standardize per app)

- **Gateway home page:** admins see all tool cards without individual grants.
- **Hols:** `systemRole === ADMIN` bypasses access in ongoing session checks (`getHolsUser()`), but **not** in credentials `authorize()` — admins still need a `ToolCardAccess` row to log in via password unless seeded.
- **Assembly / sales / mrp:** no admin bypass on access checks.

Prefer granting admins explicit tool card access via gateway seed, or implement a consistent admin bypass in both login and session guards.

Register new apps in gateway's `src/lib/tool-card-registry.ts` and seed a default tool card in gateway `prisma/seed.ts`.

---

## 7. Permissions model

Authorization is layered — use the right layer for each concern:

| Layer | Storage | Check | Used for |
|-------|---------|-------|----------|
| **SystemRole** | `User.systemRole` (`ADMIN` \| `USER`) | Session + `isAdmin()` | Admin section, seeing all tool cards |
| **HR access** | `User.hrAccess` boolean | Session + `hasHrAccess()` | `/hr` section |
| **HR grantor** | `HR_ACCESS_GRANTOR_EMAIL` env | `canGrantHrAccess()` | Who can grant/revoke HR access |
| **Team role** | `TeamMember.role` (`MANAGER` \| `MEMBER`) | Prisma query | Manager approvals, notifications |
| **Tool card access** | `ToolCardAccess` join table | Prisma query | Dashboard tiles + satellite app login |
| **Feature flags** | Env vars / team membership | Helper in `permissions.ts` | e.g. library upload for marketing team |
| **Cron** | `CRON_SECRET` Bearer token | `isAuthorizedCronRequest()` | `/api/cron/*` routes |

### 7.1 Layout guards (preferred for sections)

```typescript
export default async function AdminLayout({ children }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.systemRole !== "ADMIN") redirect("/");
  return <>{children}</>;
}
```

### 7.2 Action guards

```typescript
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!(await isAdmin(session.user.id))) throw new Error("Forbidden");
  return session.user;
}
```

Export reusable guards from `src/lib/` (e.g. `requireUser()` / `requireAdmin()` / `requireHr()` in `action-auth.ts`).

**Never trust the client for permissions.** Always verify server-side in layouts, actions, and API routes.

---

## 8. Database and schema

### 8.1 Single source of truth

All schema changes go in the **`meavo-db` repo**, not in individual app repos.

Workflow:

1. Add/modify models in `meavo-db/prisma/schema.prisma`.
2. Tag a release (e.g. `v0.3.2`).
3. Bump `@meavo/db` version in every affected app.
4. Run `npm install` + `npx prisma generate`.

### 8.2 Schema ownership

Organize models by owning app with section comments in the schema:

```
// ── gateway ──
model User { ... }
model ToolCard { ... }

// ── hols ──
model VacationRequest { ... }

// ── my-new-app ──
model MyNewThing { ... }
```

### 8.3 Naming conventions

| Item | Convention |
|------|------------|
| Models | PascalCase (`GatewaySheetRecord`) |
| Fields | camelCase in Prisma |
| IDs | `cuid()` string primary keys |
| Enums | PascalCase name, `SCREAMING_SNAKE` values |
| Join tables | Descriptive name + `@@unique([userId, cardId])` |
| Cross-app keys | Shared business IDs like `Deal.dealId`, `GatewaySheetRecord.rowKey` |

### 8.4 Migration safety (critical)

Gateway, hols, assembly, sales, mrp, factory, and rp share **one database**.

**Never run `prisma db push` from an app whose installed schema is behind other apps** — Prisma may try to **drop** tables belonging to other apps.

Gateway disables `db:push` in `package.json` for this reason. Instead:

1. **Preferred:** update schema in [meavo-db](https://github.com/meavo-booths/meavo-db), tag a release, bump `@meavo/db` in every app, then apply from the canonical schema (see below).
2. **Targeted SQL:** for gateway-only tables when schema lags, add `scripts/*.sql` and apply:

```bash
npx prisma db execute --file scripts/add-my-table.sql \
  --schema node_modules/@meavo/db/prisma/schema.prisma
```

SQL scripts must be idempotent (`CREATE TABLE IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object`).

### 8.7 Applying schema to an environment

Schema changes must be applied from the **canonical** `@meavo/db` schema — either from the `meavo-db` repo (`npm run db:push` there) or via the installed package after `npm install`:

```bash
npx prisma db push --schema node_modules/@meavo/db/prisma/schema.prisma
```

Gateway's `npm run db:push` is intentionally disabled. Production init (`npm run db:setup`) uses the command above, then runs `npm run db:seed`.

### 8.5 What a new app adds to the schema

When creating a new satellite app, add to `meavo-db`:

1. **Domain models** prefixed or named for your app (follow existing patterns in the schema).
2. **Tool card seed entry** — a `ToolCard` with `kind: APP_ACCESS`, `linkedAppKey`, and stable seed ID.
3. **Notification event types** (if the app sends emails) — register in gateway's `event-catalog.ts`.
4. Any **foreign keys to shared models** (`User`, `Team`, `Deal`, etc.) — never duplicate user/team tables.

### 8.6 Seed data

Local seed in `prisma/seed.ts`:
- Do not seed production data.
- Upsert default tool cards with stable IDs (e.g. `seed-my-app-tool`).
- Grant admin user access to the new tool card.

---

## 9. Tool cards and app registration

Every satellite app appears on the gateway home page as a **tool card**.

### 9.1 Tool card kinds

| Kind | Behavior |
|------|----------|
| `LINK` | Dashboard tile only — does not gate app login |
| `APP_ACCESS` | Dashboard tile **and** controls sign-in to a Meavo app via `linkedAppKey` |

### 9.2 Register a new app

In gateway's `src/lib/tool-card-registry.ts`:

```typescript
export type LinkedAppKey = "hols" | "assembly" | "sales" | "mrp" | "factory" | "rp" | "myapp";

export const APP_ACCESS_CARDS: Record<LinkedAppKey, AppAccessCardDefinition> = {
  myapp: {
    key: "myapp",
    label: "My App",
    domain: "myapp.meavo.app",
    defaultCardId: "seed-myapp-tool",
  },
  // ...
};
```

Also:
1. Add seed entry in `prisma/seed.ts` (gateway).
2. Add tool card icon SVG in `public/icons/tool-cards/` (gateway).
3. Set `MEAVO_APP_KEY=myapp` and `MYAPP_TOOL_CARD_ID=seed-myapp-tool` in the new app's Vercel env.
4. Create Vercel project with subdomain `myapp.meavo.app`.
5. Update `@meavo/navigation` — see §9.3.

Tool card URLs must be **HTTPS only** — validate with `new URL(url).protocol === "https:"`.

### 9.3 Update `@meavo/navigation` for a new app

The tool switcher reads cards from the database, but `@meavo/navigation` still needs typed app keys for `resolveCurrentToolId` and fallback labels. When adding an app:

1. In [meavo-booths/meavo-navigation](https://github.com/meavo-booths/meavo-navigation):
   - Add the key to `MeavoAppKey` in `src/types.ts`
   - Add label in `APP_FALLBACK_LABELS` (`src/constants.ts`)
   - Add hostname in `MEAVO_APP_HOSTS` (e.g. `myapp.meavo.app`)
2. Tag a release and bump the dependency in gateway and the new app.
3. Until navigation is updated, newer apps can pass `MEAVO_APP_KEY` with a cast (see `meavo-sales/src/components/nav.tsx`) — the switcher still matches by `linkedAppKey` from DB rows.

See also the [meavo-navigation README](https://github.com/meavo-booths/meavo-navigation) for Tailwind `content` paths and Vercel install URLs.

---

## 10. Notifications

Gateway owns email delivery. Satellite apps **enqueue only**.

### 10.1 Enqueue from any app

Gateway owns the enqueue helper at `src/lib/notifications/enqueue.ts`. **Satellite apps must copy** this module into their own repo — there is no shared `@meavo/notifications` package yet. Use `meavo-assembly/src/lib/notifications/enqueue.ts` as the template.

After copying into `src/lib/notifications/enqueue.ts`:

```typescript
import { enqueueNotification } from "@/lib/notifications/enqueue";

void enqueueNotification({
  sourceApp: "myapp",
  eventType: "myapp.thing.created",
  idempotencyKey: `myapp-thing-${thing.id}`,  // prevents duplicates
  payload: { thingId: thing.id, userName: user.name },
}).catch(console.error);
```

Register the event type in gateway's `src/lib/notifications/event-catalog.ts` (see §10.2) **before** enqueueing new events.

Satellite apps need only `DATABASE_URL` — no `RESEND_API_KEY`.

### 10.2 Register event types

Add to gateway's `src/lib/notifications/event-catalog.ts`:

```typescript
{
  eventType: "myapp.thing.created",
  sourceApp: "myapp",
  label: "Thing created",
  description: "Notify managers when a thing is created.",
  trigger: "User creates thing (myapp)",
}
```

Event types use dot-namespaced naming: `{app}.{domain}.{action}`.

### 10.3 Processing

Gateway cron (`/api/cron/process-notifications`, every 5 min) reads `NotificationOutbox`, renders templates, sends via Resend. Admins toggle events in **Admin → Notifications**.

---

## 11. File uploads

When the app needs file storage:

| Rule | Value |
|------|-------|
| Storage | Vercel Blob |
| Max size | 10 MB (`bodySizeLimit: "10mb"` in `next.config.ts`) |
| Validation | Check MIME type and file extension |
| DB field | Store `storageKey` on the Prisma model |
| Download | Stream via authenticated API route with safe `Content-Disposition` |
| Filename | Sanitize before serving |

HR contract PDFs and library HTML assets follow this pattern in gateway.

For embedded HTML dashboards, use a **sandboxed same-origin iframe** with CSP `sandbox allow-scripts`.

---

## 12. Environment variables

Every new app needs at minimum:

```bash
# Required
DATABASE_URL=          # Same Neon connection string as gateway
AUTH_SECRET=           # openssl rand -base64 32
AUTH_URL=              # https://myapp.meavo.app (or http://localhost:3000)

# Tool card access (satellite apps)
MYAPP_TOOL_CARD_ID=    # Stable seed ID from tool-card-registry defaultCardId

# Navigation / tool switcher
MEAVO_APP_KEY=         # Your app's linkedAppKey
GATEWAY_URL=           # https://meavo.app

# Optional
AUTH_GOOGLE_ID=        # Google OAuth (invite-only)
AUTH_GOOGLE_SECRET=
CRON_SECRET=           # If the app has cron routes
BLOB_READ_WRITE_TOKEN= # If the app handles uploads
EMAIL_DEV_OVERRIDE=    # Redirect all emails in dev
```

Gateway additionally needs: `ADMIN_EMAILS`, `ADMIN_PASSWORD` (seed only), `RESEND_API_KEY`, `EMAIL_FROM`, `HR_ACCESS_GRANTOR_EMAIL`, `MARKETING_TEAM_ID`, Google Sheets vars, Slack webhook, etc. Satellite apps typically do not need `ADMIN_EMAILS` unless they promote admins on login.

Always update `.env.example` when adding new env vars.

---

## 13. Deployment checklist

### 13.1 New app launch

- [ ] Create repo from gateway template (or copy structure).
- [ ] Add domain models to `meavo-db`, tag release, bump dependency.
- [ ] Register app in `tool-card-registry.ts` (gateway).
- [ ] Seed default tool card (gateway `prisma/seed.ts` or SQL script).
- [ ] Implement auth with tool card access gating (§6.5).
- [ ] Copy `enqueue.ts` and register notification events in gateway (if applicable).
- [ ] Update `@meavo/navigation` types/labels/hosts, tag release, bump dependency (§9.3).
- [ ] Add `@meavo/navigation` with correct `MEAVO_APP_KEY`.
- [ ] Create Vercel project, set env vars, add domain.
- [ ] Point `DATABASE_URL` at the **same Neon database** as gateway.
- [ ] Add cron routes to `vercel.json` (if applicable).
- [ ] Grant tool card access to initial users via gateway Admin.
- [ ] Run post-deploy smoke: `scripts/post-migration-smoke.sh` (health + cron checks).

### 13.2 Vercel config

```json
// vercel.json (if crons needed)
{
  "crons": [
    { "path": "/api/cron/my-job", "schedule": "0 * * * *" }
  ]
}
```

```typescript
// next.config.ts essentials
const nextConfig = {
  transpilePackages: ["@meavo/navigation"],
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      ],
    }];
  },
};
```

### 13.3 Health check

Add `GET /api/health` that runs `SELECT 1` against the database. Use for post-deploy smoke tests.

---

## 14. Security checklist

- [ ] Auth verified in middleware (pages), layouts (sections), actions, and API routes.
- [ ] API routes not assumed safe because middleware skips them.
- [ ] Cron routes protected with `CRON_SECRET`.
- [ ] Tool card URLs are HTTPS-only.
- [ ] Passwords hashed with bcrypt (12 rounds), minimum 8 characters.
- [ ] Login throttling on credential auth.
- [ ] Google OAuth is invite-only (existing users only).
- [ ] File uploads validated (size, MIME, extension).
- [ ] Filenames sanitized on download.
- [ ] Embedded content uses sandboxed iframes with CSP.
- [ ] No secrets in client-side code.
- [ ] `force-dynamic` on routes that must not prerender against prod DB.

---

## 15. Code conventions (quick reference)

1. **Read before writing** — match patterns in neighboring files.
2. **Minimal diffs** — do not refactor unrelated code.
3. **Imports** — always `@/lib/...`, `@/components/...`, `@/app/actions/...`.
4. **No new REST endpoints** unless streaming, cron, or auth requires it.
5. **Validation** — manual `FormData` parsing; return `{ error: "..." }` strings.
6. **DB changes** — only in `meavo-db`, never in app repos directly.
7. **Shared DB safety** — never `db:push` with an incomplete schema.
8. **Client boundaries** — keep `"use client"` narrow.
9. **Styling** — Tailwind utilities + shared `ui.tsx` components; brand green for primary actions.
10. **Side effects** — enqueue notifications, don't send email directly from satellite apps.

---

## 16. Feature area map (gateway only)

When **extending gateway** or looking for patterns in this repo:

| Feature | Pages | Actions / lib |
|---------|-------|---------------|
| Home / tools | `src/app/(app)/page.tsx` | `tool-card-registry.ts`, `tool-card-stats.ts` |
| Admin | `src/app/(app)/admin/*` | `actions/admin.ts` |
| HR | `src/app/(app)/hr/*` | `actions/hr.ts`, `actions/document-templates.ts` |
| Library | `src/app/(app)/library/*` | `actions/library.ts` |
| Profile | `src/app/(app)/profile/page.tsx` | `actions/profile.ts` |
| Notifications | `admin/notifications` | `lib/notifications/*` |
| Sheet import | `admin/sheet-import` | `actions/sheet-import.ts` |
| Auth | `login/`, `middleware.ts` | `lib/auth.ts`, `actions/auth.ts` |
| Permissions | — | `lib/permissions.ts` |

---

## 17. Related documentation

| Doc | Contents |
|-----|----------|
| `README.md` | Gateway setup, deploy, env vars |
| `AGENTS.md` | This file — patterns for new Meavo apps |
| [meavo-db](https://github.com/meavo-booths/meavo-db) | Canonical schema; the only repo allowed to alter DB structure |
| [meavo-navigation](https://github.com/meavo-booths/meavo-navigation) | Shared nav bar and tool switcher |
| `.cursor/rules/meavo-style-guide.mdc` | Brand palette, UI conventions, tool card icons |
| [meavo.com style guide](https://meavo.com/style-guide) | Official brand reference (PDF) |
| `scripts/*.sql` headers | When to use targeted migrations |
| `.env.example` | Required and optional env vars |

When in doubt, read gateway's implementation of the feature you're building and replicate its patterns.
