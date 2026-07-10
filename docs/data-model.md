# Data model — meavo-gateway

Canonical schema lives in [meavo-db](https://github.com/meavo-booths/meavo-db) (`prisma/schema.prisma`), shared by **all** Meavo apps against one Neon Postgres database.

Local reference: `node_modules/@meavo/db/prisma/schema.prisma` (read-only copy installed via the `@meavo/db` dependency).

**Do not edit schema in this repo** — gateway is a consumer, not the schema owner. Change meavo-db, tag a release, bump the git ref here, `npm install` + `prisma generate`. `npm run db:push` is intentionally disabled; targeted fixes use idempotent `scripts/*.sql` via `prisma db execute`.

Pinned version: `"@meavo/db": "github:meavo-booths/meavo-db#v0.3.1"` (see `package.json`).

## Entity relationship (gateway-owned section)

```
User ──< TeamMember >── Team
 │ ├──< Account            (OAuth)
 │ ├──< ToolCardAccess >── ToolCard
 │ └──1 Employee ──< EmployeeDocument
 │        └──< EmployeeSalaryHistory
 │
 ├──< DocumentTemplate ──< DocumentTemplateVersion ──< GeneratedDocument
 └──< LibraryAsset

CompanyProfile (per Company enum: MEAVO | OA)
LoginThrottle  (keyed rate limiting)
GatewaySheetRecord (standalone; sheet import)   SheetImportState (shared with assembly)
NotificationOutbox ──< NotificationDelivery     NotificationEventSetting
```

Other apps' models (hols vacation, assembly, sales/deals, MRP, factory) live in the same schema — gateway reads some (e.g. `VacationRequest` for the Slack digest) but writes only its own.

## Core tables / models

### `User`

Shared identity for the whole ecosystem — every app foreign-keys to it; never duplicate.

| Field | Notes |
|-------|-------|
| `email` (unique), `passwordHash` | Credentials login; hash bcrypt 12 rounds, nullable for Google-only users |
| `systemRole` | `ADMIN` \| `USER`; auto-promoted for `ADMIN_EMAILS` |
| `hrAccess` | Gates `/hr`; only HR grantors may change |

### `Team` / `TeamMember`

Teams with hex `color` and `yearlyAllowance` (vacation days). `TeamMember.role` is `MANAGER` \| `MEMBER`; unique per `[userId, teamId]`.

### `ToolCard` / `ToolCardAccess`

Home-page tiles. `kind: LINK | APP_ACCESS`; `APP_ACCESS` cards carry a unique `linkedAppKey` and gate satellite app login. `ToolCardAccess` is the grant join table (`@@unique([userId, cardId])`). Stable seed IDs (e.g. `seed-sales-tool`) in `src/lib/tool-card-registry.ts`.

### `Employee` (+ `EmployeeSalaryHistory`, `EmployeeDocument`, `CompanyProfile`)

HR record 1:1 with `User`: `company` (MEAVO/OA), `contract` (FTE/FREELANCE), start/end dates, role, salary, freelancer provider-company details. Documents store Blob `storageKey`. `CompanyProfile` holds per-company legal details and extra-tax percentages used in salary reports.

### `DocumentTemplate` / `DocumentTemplateVersion` / `GeneratedDocument`

Versioned HR templates (body + custom placeholders); generated PDFs record filled values, warnings, and Blob `storageKey`.

### `GatewaySheetRecord` / `SheetImportState`

One row per Ops File sheet row (`rowKey` = DealID, full row as `data` JSON) with extracted revenue/invoice-date/sales-rep/market fields for the revenue dashboard. `SheetImportState` tracks import status (gateway uses id `"gateway"`; assembly uses `"default"`).

### `NotificationOutbox` / `NotificationDelivery` / `NotificationEventSetting`

Cross-app email outbox: any app enqueues (with `idempotencyKey`), gateway cron delivers via Resend and logs deliveries. `NotificationEventSetting` lets admins toggle event types.

### `LoginThrottle` / `LibraryAsset` / `Account`

Shared login rate limiting (10 failures / 15 min); uploaded HTML dashboards (Blob-backed, unique `slug`); NextAuth OAuth accounts.

## Sync / external copies

- **Ops File Google Sheet → `GatewaySheetRecord`** — inbound only, cron every 30 min; sheet is the source, DB is the copy.
- **`NotificationOutbox` → Resend** — outbound email, cron every 5 min.
- **`VacationRequest` (hols-owned) → Slack** — weekly digest cron, read-only.

## Queries agents should reuse

- Prisma singleton: `src/lib/prisma.ts` — never instantiate `PrismaClient` elsewhere.
- Permissions: `src/lib/permissions.ts`. Tool card stats: `src/lib/tool-card-stats.ts`.
- HR queries/filters: `src/lib/hr-employee.ts`, `src/lib/hr-filters.ts`, `src/lib/salary.ts`.
- Revenue aggregations: `src/lib/revenue-stats.ts`, `src/lib/revenue-dashboard.ts`.
- Sheet import: `src/lib/sheets-import.ts`, `src/lib/sheet-columns.ts`.
- Avoid raw SQL — the exception is idempotent migration scripts in `scripts/*.sql`.
