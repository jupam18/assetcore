# AssetCore — Claude Code Project Instructions

## What This Project Is

AssetCore is an enterprise IT Asset Management (ITAM) platform. It manages ~20,000 hardware assets (notebooks, monitors, cellphones, peripherals) across 10 countries with 50 technicians. It follows ITIL asset management best practices and is inspired by InvGate Assets' workflow model.

Read `docs/AssetCore_Architecture.docx` and `docs/AssetCore_Setup_Guide_v1.0.docx` before starting any session. These are the source of truth for every architectural and data model decision.

---

## Tech Stack (Do Not Deviate)

- **Runtime:** Node.js 20 LTS
- **Framework:** Next.js 14 with App Router, TypeScript, `src/` directory
- **Database:** PostgreSQL 16 (Docker container, port 5432)
- **ORM:** Prisma with `prisma/schema.prisma` as the single source of truth for the data model
- **Cache/Queue:** Redis 7 (Docker container, port 6379)
- **Auth:** NextAuth.js with credentials provider, JWT stored in HTTP-only cookies
- **UI:** Tailwind CSS + shadcn/ui components
- **Workflow UI:** React Flow (for visual state machine builder, Phase 2)
- **Charts:** Recharts (for dashboards, Phase 3)
- **Validation:** Zod schemas for all API input validation
- **Testing:** Vitest
- **Background Jobs:** BullMQ + ioredis (Phase 2+)

---

## Project Structure

```
assetcore/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── (auth)/           # Public routes: login, password reset
│   │   ├── (dashboard)/      # Protected routes: all app pages
│   │   │   ├── assets/       # Asset list + detail pages
│   │   │   ├── workflows/    # Workflow builder (Phase 2)
│   │   │   ├── reports/      # Dashboards + report builder (Phase 3)
│   │   │   ├── admin/        # Admin Portal
│   │   │   │   ├── users/    # User management
│   │   │   │   ├── roles/    # Role builder
│   │   │   │   ├── lookups/  # Lookup list management
│   │   │   │   ├── settings/ # System settings
│   │   │   │   ├── audit/    # Global audit log viewer
│   │   │   │   └── workflows/# Workflow builder
│   │   │   └── settings/     # Site management, system config
│   │   └── api/              # API routes
│   ├── components/           # Shared UI components
│   │   ├── ui/               # shadcn/ui components
│   │   └── ...               # App-specific components
│   ├── lib/                  # Shared utilities
│   │   ├── auth.ts           # NextAuth configuration
│   │   ├── prisma.ts         # Prisma client singleton
│   │   ├── audit.ts          # Audit logging service
│   │   └── validations/      # Zod schemas
│   ├── hooks/                # Custom React hooks
│   └── types/                # Shared TypeScript types
├── prisma/
│   ├── schema.prisma         # THE data model (single source of truth)
│   ├── migrations/           # Prisma migrations
│   └── seed.ts               # Seed script
├── docs/                     # Architecture + setup docs
├── docker-compose.yml        # PostgreSQL + Redis only
├── .env                      # Local env vars (never commit)
└── CLAUDE.md                 # This file
```

---

## Critical Rules

### Database & Data Model
- The Prisma schema in `prisma/schema.prisma` is the single source of truth. Never create tables or columns outside of it.
- Always run `npx prisma migrate dev --name descriptive_name` after schema changes.
- Serial Number is the primary business identifier for assets. It is unique, uppercase, trimmed, and immutable after creation.
- **Asset Tag is a manual free text field.** It is NOT auto-generated. Technicians type it in during asset creation.
- Dropdown fields (Manufacturer, Model, RAM, Storage, Processor, Carrier) are populated from LookupList/LookupValue tables. Technicians select from admin-defined values only (closed lists).
- The `customFields` JSONB column on Asset stores type-specific fields. Validate against the `fieldSchema` JSONB on AssetType before saving.
- The audit_log table is append-only. Never add UPDATE or DELETE operations on it. At the DB level, it should have `REVOKE DELETE, REVOKE UPDATE`.
- Notes (AssetNote) are append-only. No edit or delete except by Global Admin (and even then, the deletion is audit-logged).

### Asset Statuses and Auto-Date Rules
The seven statuses are: IN_STOCK, DEPLOYED, IN_MAINTENANCE, PENDING_RETURN, LEGAL_HOLD, RETIRED, DISPOSED.
- New assets always start as IN_STOCK.
- When status transitions to DEPLOYED: auto-set `deployedDate = today` and create an Assignment record.
- When status transitions to IN_STOCK (via any return path): auto-set `returnDate = today` and close the active Assignment.
- LEGAL_HOLD: can enter from ANY state. Stores previous state in `previousStatus`. On release, restores previous state. Only Global Admin can place/release.
- RETIRED and DISPOSED are terminal states (no going back). RETIRED can transition to DISPOSED. DISPOSED has no transitions.
- `deployedDate` and `returnDate` are read-only on the UI — they are set exclusively by workflow transitions.

### Lookup Lists
- All dropdown fields in the asset forms are populated from the LookupList/LookupValue tables.
- Lookup Lists are managed exclusively through the Admin Portal. Technicians cannot add new values.
- Model values are filtered by the selected Make (parent-child relationship via `parentValueId`).
- Lists to seed: make, model, ram, storage, processor, carrier, country, asset_type.
- Values can be deactivated (not deleted) to preserve referential integrity.

### Admin Portal
- Located at `/admin/*` routes. Only accessible to GLOBAL_ADMIN role.
- Includes: User Management, Role Builder, Lookup Lists, Workflow Builder, System Settings, Global Audit Log.
- User deactivation (not deletion) preserves audit trail integrity.

### Authentication & Authorization
- Three default roles: GLOBAL_ADMIN, COUNTRY_LEAD, TECHNICIAN.
- JWT must include: userId, role, and countryId.
- Protect all routes under `/(dashboard)` with NextAuth middleware.
- Country Leads see only assets in their country. Technicians see only assets in their country.
- Global Admins see everything. Only Global Admins can access `/admin/*` routes.
- Future: Role Builder allows creating custom roles with granular permissions.

### Audit Trail
- Every write operation (create, update, delete, status change, assignment, transfer) MUST be audit-logged.
- Audit entries record: who, what, when, old value, new value, IP address.
- Build an `auditLog()` service function that all mutations call. Pass the entity type, entity ID, action, field changes, and the performing user.
- Never skip audit logging, even for seed scripts or bulk imports.

### API Patterns
- All API routes go in `src/app/api/`.
- Use Zod for request validation on every endpoint. Define schemas in `src/lib/validations/`.
- Return consistent JSON responses: `{ success: boolean, data?: any, error?: string }`.
- Always return proper HTTP status codes: 400 (validation), 401 (unauthenticated), 403 (unauthorized), 404 (not found), 422 (business rule violation).
- Paginated list endpoints use: `?page=1&limit=50&sort=createdAt&order=desc`.
- Asset list search (`?q=`) searches across: serialNumber, assetTag, deviceName.
- Lookup list values endpoint: `GET /api/lookups/:name/values` returns active values sorted by sortOrder.

### Frontend Patterns
- Use shadcn/ui components as the base. Do not install other UI libraries.
- Use TanStack Table for all data tables (asset list, audit log, user list) with server-side pagination, sorting, and filtering.
- Asset detail page has exactly four tabs: Info, Logistics, Audit Log, Notes. Follow the field specs in Part 2 of the Setup Guide.
- Dropdown fields (Make, Model, RAM, Storage, Processor) fetch values from `/api/lookups/:name/values`.
- Model dropdown filters based on selected Manufacturer (cascading dropdown).
- Forms save on explicit submit (not auto-save). Show loading state during save.
- Use `sonner` (included with shadcn/ui) for toast notifications.
- All dates display in the user's timezone. Store as UTC in the database.
- Status field on Info tab is read-only with a colored badge. deployedDate and returnDate are read-only.

### Workflow Engine (Phase 2)
- Workflows are configurable state machines. Each workflow has states (nodes) and transitions (edges).
- Default workflow: Hardware Lifecycle with 7 states (In Stock, Deployed, In Maintenance, Pending Return, Legal Hold, Retired, Disposed).
- Transitions validate: (1) the transition exists for the current state, (2) the user's role is allowed to trigger it, (3) any conditions are met.
- Auto-actions on transitions: Deploy sets deployedDate, Return sets returnDate, Legal Hold stores/restores previous state.
- Workflow changes create a new version. Existing instances stay on their version.

### Code Quality
- Always use TypeScript strict mode. No `any` types unless absolutely unavoidable (and add a comment explaining why).
- Every Zod schema should have a corresponding TypeScript type exported via `z.infer<typeof schema>`.
- Prisma queries should select only needed fields when possible.
- Handle errors explicitly. No swallowed catches. Log errors server-side.
- When generating components, include loading states and error states, not just the happy path.

---

## Phased Implementation

We are building this in phases. Do not build features from a later phase unless explicitly asked.

- **Phase 1 (current):** Auth, Admin Portal (users, lookups, settings), Asset CRUD with all four tabs, lookup-driven dropdowns, default workflow with 7 statuses and auto-date rules, audit trail, CSV bulk import.
- **Phase 2:** Workflow builder UI (React Flow), Role Builder UI, asset-workflow integration.
- **Phase 3:** Dashboards, report builder, CSV/XLSX export, email notifications.
- **Phase 4:** SSO (SAML/OIDC), AD sync, MDM integration (Intune/JAMF), advanced RBAC.

---

## Seed Data

When creating or updating seed scripts, always include:
- 3 countries: Uruguay, Argentina, Brazil — each with at least one office (Location).
- 3 users: one GLOBAL_ADMIN, one COUNTRY_LEAD (Uruguay), one TECHNICIAN (Argentina).
- 3 asset types: Notebook, Monitor, Cellphone — each with appropriate `fieldSchema`.
- Default Lookup Lists with sample values:
  - **make:** Dell, Lenovo, HP, Apple, Samsung, LG, Logitech, Microsoft
  - **model:** ThinkPad T14 Gen 4 (Lenovo), Latitude 5550 (Dell), MacBook Pro 14" (Apple), iPhone 15 Pro (Apple), U2723QE (Dell)
  - **ram:** 4 GB DDR4, 8 GB DDR5, 16 GB DDR5, 32 GB DDR5
  - **storage:** 128 GB SSD, 256 GB NVMe, 512 GB NVMe, 1 TB NVMe
  - **processor:** Intel Core i5-1345U, Intel Core i7-1365U, Apple M3, Apple M3 Pro
  - **carrier:** DHL, FedEx, UPS, Local Courier, Internal Transfer
- The default Hardware Lifecycle workflow with all 7 states and transitions from the architecture doc.
- At least 10 sample assets spread across types, countries, statuses, and conditions.

---

## Common Commands

```bash
# Start databases
docker compose up -d

# Start dev server
npm run dev

# Run migration after schema change
npx prisma migrate dev --name describe_what_changed

# Reset database (fresh start)
npx prisma migrate reset

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Seed data
npx prisma db seed

# Run tests
npm run test

# Build (verify before committing)
npm run build
```

---

## When In Doubt

- Check the Prisma schema first — it is the source of truth for the data model.
- Check the architecture doc for business logic decisions (workflow rules, role permissions, audit requirements).
- Check the setup guide for field-level specs (which fields are required, which are auto-populated, which are lookups).
- Ask me before making architectural changes that deviate from the docs.
