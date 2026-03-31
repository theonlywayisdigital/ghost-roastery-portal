# Roastery Platform

## Overview
Roastery Platform. Separate Next.js 14 app sharing the same Supabase database as the main site. Serves both roasters (B2B) and customers (B2C).

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (light mode, B2B aesthetic)
- Supabase (shared instance with main site)
- @supabase/ssr (cookie-based Supabase Auth)
- Resend (email)
- Lucide React (icons)

## Boundary Rule
**NEVER operate on files outside this repository (`/Users/alexmccormick/ghost-roasting-portal/`).**

## Supabase
- Shares a database with the main site (roasteryplatform.com)
- Service role key for server-side operations (bypasses RLS)
- Project ref: zaryzynzbpxmscggufdc
- Migrations are managed in `supabase/migrations/` in this repo
- Create new migrations: `npx supabase migration new <name>`
- Deploy migrations: `npx supabase db push`
- Regenerate types: `npx supabase gen types typescript --linked > src/types/database.ts`

## Auth
- Uses Supabase Auth via @supabase/ssr (cookie-based sessions)
- `getCurrentUser()` from `src/lib/auth.ts` — returns user with roles and roaster data
- `getCurrentRoaster()` — backward-compatible wrapper, returns roasters row
- Roles stored in `user_roles` table: roaster, ghost_roastery_customer, retail_buyer, wholesale_buyer, admin
- Middleware refreshes Supabase session on every request
- Sidebar shows nav sections based on user roles

## Commands
```bash
npm run dev    # Start on port 3001
npm run build  # Production build
npx tsc --noEmit  # Type check
```

## Port
Runs on port 3001 (main site runs on 3000).

## Cross-Portal Consistency Rules

### MANDATORY PRE-BUILD AUDIT
Before writing ANY code for a new feature, you must:

1. **Find every existing page, component, and API route** related to this feature across ALL portals (admin, roaster, customer). List them.
2. **Find every shared component** in the project (DataTable, FilterBar, StatusBadge, Pagination, etc.). You MUST use these — never create alternatives.
3. **If building a page that exists in another portal**, COPY that page and modify it. Do not build from scratch.
4. **If building a feature that touches data another feature already uses**, read that feature's code first and use the same queries, types, and data shapes.
5. **Show the audit findings BEFORE writing any code.** If the audit isn't shown, this step was skipped.

### DESIGN RULE
Every portal shows the same UI for the same data. Admin sees everything with full controls. Roaster sees their own data with their controls. Customer sees their own data read-only. The visual design, layout, components, and page structure are IDENTICAL — the only differences are data scope and available actions.

### NEVER DO
- Create a new component that replicates functionality of an existing one
- Create a new page layout when one already exists for the same data type
- Create new TypeScript types when matching types exist
- Build custom HTML tables, inline CSS badges, or bespoke filter UIs — use the shared components (`DataTable`, `FilterBar`, `StatusBadge`, `Pagination` from `@/components/admin`)

### Shared Components (`src/components/admin/`)
- `DataTable` — all list/table views
- `FilterBar` — all filter UIs
- `StatusBadge` — all status/type badges
- `Pagination` — all paginated lists
