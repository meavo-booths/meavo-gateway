# Domain reference — meavo-gateway

Business rules and **where to change what**. For stack see [architecture.md](architecture.md). For tables see [data-model.md](data-model.md).

## Glossary

| Term | Meaning |
|------|---------|
| Tool card | Home-page tile; `LINK` kind is a plain link, `APP_ACCESS` kind gates login to a satellite app via `linkedAppKey` |
| Tool card access | `ToolCardAccess` row granting a user a card; satellites check it at login and on every request |
| Employee | HR record attached to a `User` after "Hire" — company (MEAVO/OA), contract (FTE/FREELANCE), dates, role, salary |
| Document template | Versioned HR contract/letter template with placeholders, rendered to PDF (`pdf-lib`) |
| Library asset | Uploaded HTML dashboard (culture hub, market dashboard) served in a sandboxed iframe |
| Ops File | Google Sheet imported into `GatewaySheetRecord` (row 1 headers, DealID unique key); powers the revenue dashboard |
| Notification outbox | `NotificationOutbox` rows enqueued by any app; gateway cron renders and sends via Resend |

## Status / state values

- `NotificationOutbox.status`: `PENDING → SENT | FAILED | SKIPPED` (processed by `src/lib/notifications/process.ts`).
- `Employee`: active vs past derived from `endDate` (past date = past employee) — no status enum.
- `ToolCard.isActive`: inactive cards are hidden from the home page.

## Roles / personas

| Role / source | Route or scope | Permissions |
|----------------------|----------------|-------------|
| `SystemRole.ADMIN` (`User.systemRole`; auto-granted to `ADMIN_EMAILS`) | `/admin` | Manage users, teams, tool cards + grants, notifications, sheet import; sees all tool cards |
| HR access (`User.hrAccess`) | `/hr` | Employee database, hire/end contract, salaries, documents, templates |
| HR grantor (`HR_ACCESS_GRANTOR_EMAIL` env) | Admin users list | Only these emails can grant/revoke HR access |
| Marketing team member (`MARKETING_TEAM_ID` env) | Library | Upload/replace the Market Dashboard asset |
| Regular user | `/`, `/library`, `/profile` | Sees granted tool cards; edits own profile |

Resolved in `src/lib/permissions.ts` (`isAdmin`, `hasHrAccess`, `canGrantHrAccess`, `canUploadLibraryAsset`) and layout guards in `src/app/(app)/admin/layout.tsx` and `src/app/(app)/hr/layout.tsx`.

## Mutation map

| Change | Domain module | Action / API | Notes |
|--------|---------------|--------------|-------|
| Users, teams, tool cards, access grants | `src/lib/tool-card-registry.ts`, `src/lib/team-colors.ts` | `src/app/actions/admin.ts` | Tool card URLs must be HTTPS; enqueues `gateway.user.created` |
| Hire / edit / end contract, salaries | `src/lib/hr-employee.ts`, `src/lib/salary.ts` | `src/app/actions/hr.ts` | Enqueues hired/contract-ended events; PDFs → Blob |
| Document templates + PDF generation | `src/lib/template-*.ts` | `src/app/actions/document-templates.ts` | Versioned; placeholders from `template-placeholders.ts` |
| Library assets (culture hub, dashboards) | `src/lib/permissions.ts`, `src/lib/culture-hub-content.ts` | `src/app/actions/library.ts` | Upload gated by admin or marketing team |
| Own profile | `src/lib/employee-details.ts` | `src/app/actions/profile.ts` | |
| Notification events on/off | `src/lib/notifications/event-settings.ts` | `src/app/actions/admin-notifications.ts` | Catalog in `notifications/event-catalog.ts` |
| Sheet import (manual trigger) | `src/lib/sheets-import.ts` | `src/app/actions/sheet-import.ts` | Cron does the scheduled runs |
| Login / password | `src/lib/auth.ts`, `src/lib/login-throttle.ts`, `src/lib/password.ts` | `src/app/actions/auth.ts` | bcrypt 12 rounds; throttle 10 fails / 15 min |

## Authorization

- Resolved in: `src/lib/permissions.ts`, `src/lib/hr-auth.ts` (`requireHr`), per-action guards (e.g. `requireAdmin` in `src/app/actions/admin.ts`), section layouts, and `src/middleware.ts` (pages only).
- Rules agents get wrong without docs:
  - Middleware does **not** protect `/api/*` — every route handler checks auth itself.
  - HR access is separate from Admin — an admin without `hrAccess` cannot use `/hr`.
  - Only `HR_ACCESS_GRANTOR_EMAIL` users can change `hrAccess` — not all admins.
  - Gateway's own login is not gated by `ToolCardAccess` (that gating is for satellite apps).
  - Any mutation that should email someone must enqueue via `src/lib/notifications/enqueue.ts` with an `idempotencyKey`; event type must exist in `event-catalog.ts` first.
