# EQPMGR

Equipment manager for cyclists: bikes and accessories, their components, wear estimates, maintenance and work orders, and Strava activity sync. Next.js 15 (App Router) + TypeScript + Supabase (Postgres + RLS), Tailwind, Radix UI.

The codebase was migrated from Firebase/Firestore to Supabase. Expect stale and half-migrated code. Supabase is the source of truth. Don't assume Firestore semantics still hold.

## Commands

- Dev: `npm run dev -- --hostname 0.0.0.0 --port 3007` (the `dev` script itself is plain `next dev`, so pass the port)
- Typecheck: `npm run typecheck`. Run it after every change. It currently passes clean (`tsc_errors.txt` in the root is stale; ignore it).
- Migrations: `supabase migration list`, `supabase db push`
- No test suite exists.

## Environment

- The Supabase CLI is linked to a **cloud** project (`supabase/.temp/project-ref`). There is no `supabase/config.toml`, so no local Supabase stack. `db push` goes straight to the shared cloud DB.
- The sibling repo `~/Developer/EQPMGRshop` uses the **same cloud database**. Schema and RLS changes here affect it too.
- Env files: `.env.local` (dev), plus `.env`, `.env.production`, `.env.netlify`, `.env.docker`. All are gitignored except the `*.example` files. Never print or commit their values.

## Layout

- `src/app/(app)/`: authenticated app routes: `dashboard`, `equipment`, `settings`, `admin`, `import-text`, `service-providers`, `insurance`, `bike-insights`
- `src/app/api/`: route handlers (`strava/*`, `admin/*`, `debug/*`, `provision`, `health`, `weather`, `geocode*`)
- `src/backend/`: backend abstraction (`factory.ts`, `interfaces/`, `supabase/`). Entry point is `@/backend` (`getDb`, `getAuth`, `getServerDb`, ...).
- `src/lib/`: `types.ts` (core data model), `admin-access.ts`, `supabaseClient.ts` (browser singleton), the component seed data `*-data.ts`, and `wear-simulation.ts`
- `src/services/`: duplicate detection, component helpers, vector search
- `src/context/auth-context.tsx` + `src/hooks/use-auth.ts`: Supabase auth plus the `app_users` profile
- `supabase/migrations/`: schema and RLS. Read these before changing data-access logic.

## Data access: two patterns coexist

1. **`SupabaseDbAdapter`** (`src/backend/supabase/SupabaseDbAdapter.ts`): a Firestore-style API (`getDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `query`, `batch`). It converts camelCase app keys and fields to snake_case for the DB and back on reads. App code stays camelCase and SQL stays snake_case. Preserve this bridge.
2. **Direct Supabase client** (`@/lib/supabaseClient` or `createClient`): recent commits moved several server actions to this. When you use it, you handle snake_case yourself.

Adapter caveats:
- `batch().commit()` runs ops **sequentially, not atomically**. `runTransaction` is also not a real transaction. A failure midway leaves partial writes.
- Writes to `app_users.strava` through the adapter are **blocked on purpose**, because the adapter used to null the field after OAuth. Write the `strava` blob with the direct client.

## Ownership model (main bug source)

- `equipment` has both `user_id` (not null) and `app_user_id` (nullable), both referencing `app_users(id)`. RLS allows access when **either** matches `auth.uid()`.
- `components` has its own `user_id`, but RLS on components checks ownership **through the parent equipment row** (`components.equipment_id → equipment`).
- `work_orders` match on `user_id` or `service_provider_auth_uid`.
- Queries need to match the same either/or logic, or rows will look missing.

## RLS

RLS enforces permissions, not just app code. A write that "does nothing" with no error is usually a missing policy. Check `supabase/migrations/` before patching app logic.
- `001` sets up select/insert/update policies. Delete policies for `equipment` and `components` come from `012`.
- `011` adds a service-role policy on `app_users` for server-side writes (Strava token exchange).

## Strava

- Tokens live in the `app_users.strava` JSON blob: `accessToken`, `refreshToken`, `expiresAt`, `athleteId`, `processedActivities`.
- Refresh logic is in `src/app/(app)/settings/apps/actions.ts` (it refreshes 5 min before expiry). OAuth exchange is in `src/app/api/strava/token-exchange/route.ts`.
- Sync runs on dashboard and settings loads. Avoid adding refresh triggers: repeated refreshes spam Strava and the logs.

## Admin access

- `src/lib/admin-access.ts` has a single-email allowlist. `src/app/(app)/admin/layout.tsx` and `src/app/debug/layout.tsx` gate the UI with `AdminAccessGate`.
- That gate is client-side only. Route handlers enforce access themselves through `src/lib/server-auth.ts`: `requireAdmin` (bearer token plus allowlist, returning 401/403) or `requireUser` (bearer token only, returning 401).
- Not everything under `api/admin/*` is admin-only. `import-text`, `simulate-wear` and `generate-maintenance-schedule` back regular-user features, so they use `requireUser`. `add-bike-model`, `master-component-sync` and `import-feedback-analysis` use `requireAdmin`. Every new route handler must call one of the two.
- `updateMasterComponentAndSyncUsers` in `admin/add-bike-model/actions.ts` is a `'use server'` export with no auth check of its own. Only call it from guarded code.

## Delete flow

`src/app/(app)/equipment/[id]/page.tsx` deletes child `components` rows first, then the `equipment` row, then does `router.push('/equipment')` + `router.refresh()`. Keep that order. It depends on the `012` delete policies.

## Stale and legacy code

- `src/ai/`: Genkit-era flows. `genkit.ts` is now a thin shim over `src/lib/llm.ts` (Genkit isn't a dependency). Check that a flow is actually called before relying on it.
- Firebase leftovers: `firebase.json`, `firestore.rules`, `.firebaserc`, `apphosting.yaml`, and the `firebase`/`firebase-admin` dependencies.
- Many root `*.md` files (`BACKEND_*`, `MIGRATION_GUIDE`, `IMPLEMENTATION_COMPLETE`, ...) describe past migration phases and may be out of date. `PHASE1_2_BREADCRUMB.md` is the most recent work log.
- Stray files: `src/add-equipment-dialog.tsx` (duplicate of the one in `src/components/`), `src/tmp_parse_form_test.mjs`, `tmp-test-d.ts`, `repomix-output.xml`.
- `admin/import-url` and some seeders may be inactive. Verify before editing.

## Known issues (as of 2026-10-15)

- **Migration 008 collision.** `HEAD` has `008_enable_rls_on_metadata_tables.sql` (enables RLS on all app tables). The working tree deletes it and adds an untracked `008_add_import_text_feedback.sql`. Both have version `008`. If the cloud DB already applied the old 008, `db push` will treat the new one as applied and skip creating `import_text_feedback`. Check `supabase migration list` before pushing, and renumber the new migration if needed.
- **Much recent work is uncommitted** (delete fix, migration 012, admin gating, the `/import-text` route, the add-bike-model slug fix). Don't discard working-tree changes.
