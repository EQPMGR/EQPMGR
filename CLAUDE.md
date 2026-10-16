# EQPMGR

Equipment manager for cyclists: bikes and accessories, their components, wear estimates, maintenance and work orders, and Strava activity sync. Next.js 15 (App Router) + TypeScript + Supabase (Postgres + RLS), Tailwind, Radix UI.

The codebase was migrated from Firebase/Firestore to Supabase. Expect stale and half-migrated code. Supabase is the source of truth. Don't assume Firestore semantics still hold.

## Commands

- `next.config.ts` sets `ignoreBuildErrors`, so Netlify builds succeed even with type errors. Always run the typecheck yourself.

- Dev: `npm run dev -- --hostname 0.0.0.0 --port 3007` (the `dev` script itself is plain `next dev`, so pass the port)
- Typecheck: `npm run typecheck`. Run it after every change. It currently passes clean (`tsc_errors.txt` in the root is stale; ignore it).
- Migrations: `supabase migration list`, `supabase db push`
- No test suite exists.

## Environment

- The Supabase CLI is linked to a **cloud** project (`supabase/.temp/project-ref`). There is no `supabase/config.toml`, so no local Supabase stack. `db push` goes straight to the shared cloud DB.
- The sibling repo `~/Developer/EQPMGRshop` uses the **same cloud database**. Schema and RLS changes here affect it too.
- Env files: `.env.local` (dev), plus `.env`, `.env.production`, `.env.netlify`, `.env.docker`. All are gitignored except the `*.example` files. Never print or commit their values.

## Layout

- `src/app/(app)/`: authenticated app routes: `dashboard`, `equipment`, `settings`, `admin`, `import-text`, `add-bike-model`, `service-providers`, `insurance`, `bike-insights`
- `src/app/api/`: route handlers (`strava/*`, `admin/*`, `bike-models`, `provision`, `health`, `weather`, `geocode*`)
- `src/backend/`: backend abstraction (`factory.ts`, `interfaces/`, `supabase/`). Entry point is `@/backend` (`getDb`, `getAuth`, `getServerDb`, ...).
- `src/lib/`: `types.ts` (core data model), `admin-access.ts`, `server-auth.ts`, `supabaseClient.ts` (browser singleton), the component seed data `*-data.ts`, and `wear-simulation.ts`
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
- That gate is client-side only. The server enforces access through `src/lib/server-auth.ts`:
  - Route handlers: `requireUser(request)` (bearer token, 401) or `requireAdmin(request)` (also allowlist, 403).
  - Server actions: `verifyUserToken(idToken)` or `verifyAdminToken(idToken)`, which throw. The client passes `await user.getIdToken()` from `useAuth()`.
- **Every `'use server'` export is a public endpoint.** Most actions use the service-role key, which bypasses RLS, so each one must verify the token itself. Never trust a `userId` sent by the client; use the verified uid. Before touching equipment or components, check ownership (see `assertOwnsEquipment` in `equipment/[id]/actions.ts`). Don't put `'use server'` on plain helper modules.
- Not everything under `api/admin/*` is admin-only. `import-text`, `simulate-wear` and `generate-maintenance-schedule` back regular-user features (`requireUser`). `master-component-sync` and `import-feedback-analysis` use `requireAdmin`.
- Add Bike Model is a user feature: the page is `/add-bike-model` (`/admin/add-bike-model` redirects there) and the API is `/api/bike-models`. New models go into the shared catalog with `created_by` set.
- Unguarded on purpose (read-only shared catalog): `getServiceProviders`, `fetchAllMasterComponents`.

## Delete flow

`src/app/(app)/equipment/[id]/page.tsx` deletes child `components` rows first, then the `equipment` row, then does `router.push('/equipment')` + `router.refresh()`. Keep that order. It depends on the `012` delete policies.

## Stale and legacy code

- Firebase leftovers: `firebase.json`, `firestore.rules`, `.firebaserc`, `apphosting.yaml`, and the `firebase`/`firebase-admin` dependencies.
- Many root `*.md` files (`BACKEND_*`, `MIGRATION_GUIDE`, `IMPLEMENTATION_COMPLETE`, ...) describe past migration phases and may be out of date. `PHASE1_2_BREADCRUMB.md` is the most recent work log.
- Stray files: `src/add-equipment-dialog.tsx` (duplicate of the one in `src/components/`), `src/tmp_parse_form_test.mjs`, `tmp-test-d.ts`, `repomix-output.xml`.
- Some admin seeders may be inactive. Verify before editing.

## Known issues (as of 2026-10-15)

- **Migration 008.** The old `008_enable_rls_on_metadata_tables.sql` was replaced by `008_add_import_text_feedback.sql` (the old RLS rules caused problems). The cloud DB records only version `008`, and `import_text_feedback` exists. It is unconfirmed whether the old RLS rules were ever applied; check `supabase_migrations.schema_migrations` for the name.
