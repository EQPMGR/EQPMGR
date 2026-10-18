# EQPMGR

Equipment manager for cyclists: bikes and accessories, their components, wear estimates, maintenance and work orders, and Strava activity sync. Next.js 15 (App Router) + TypeScript + Supabase (Postgres + RLS), Tailwind, Radix UI.

The codebase was originally built on Firebase and migrated to Supabase; all Firebase/Google code and config was removed on 2026-10-17. Some APIs (the `SupabaseDbAdapter` with `getDoc`/`setDoc`/subcollection paths) still mimic the old document-database style. Supabase is the source of truth. Don't add Google/Firebase services back.

## Working with Sage (the owner)

- `ROADMAP.md` holds decisions, phases, open questions and the done log for **both** apps. Read it at the start of a session, and update it in the same PR whenever work lands or a decision is made. Sage relies on it instead of keeping their own lists.
- Sage is new to software development. Explain things in plain language, and interpret loose terminology generously.
- The shop app (`~/Developer/EQPMGRshop`) shares this Supabase database and login system. Any schema or RLS change must be checked against both apps. All migrations live in this repo's `supabase/migrations/`.

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

## Ownership model

- `app_users.id` is the Supabase auth uid. `equipment.user_id` is the single owner column. (`app_user_id` was removed in migration `013`; don't reintroduce it.)
- In the adapter, subcollection paths like `app_users/{uid}/equipment` filter on `user_id` (see `buildParentIdField`).
- `components` has its own `user_id`, but RLS on components checks ownership **through the parent equipment row** (`components.equipment_id → equipment.user_id`).
- `work_orders` match on `user_id` or `service_provider_auth_uid`.
- EQPMGRshop shares this database and also uses `equipment.user_id`.

## RLS

RLS enforces permissions, not just app code. A write that "does nothing" with no error is usually a missing policy. Check `supabase/migrations/` before patching app logic.
- `001` sets up select/insert/update policies. Delete policies for `equipment` and `components` come from `012`.
- `011` adds a service-role policy on `app_users` for server-side writes (Strava token exchange).

## Component wear

- Every ride (Strava or manual) is stored once in `rides`. `apply_ride_wear(ride_id)` adds its wear to each part on the bike (migration 016). Never write `wear_percentage` from app code except to reset it.
- Lifespans live in the `wear_baselines` table: road and off-road km, or service hours for suspension and droppers. Parts are matched by regex on "name | brand | series | model" (`match_wear_baseline`). Untracked parts (frame, bars, stems, levers, disc-brake rims) get no wear.
- Distance wear = km × wet factor × e-bike factor ÷ lifespan for the ride's terrain. Wear can go above 100% (overdue).
- The `components_set_wear_baseline` trigger sets the baseline and `expected_replacement_km` when a part is added, and resets wear when its catalog part changes. So `replace_component()` and any insert get the right values automatically.
- Weather: `src/lib/ride-weather.ts` (WeatherAPI history, about 7 days back). A ride is wet if ≥0.3 mm falls during it or ≥1 mm in the 12 h before. Strava rides use `start_latlng` and `start_date`; manual rides use the browser location, or the rider marks wet/dry.
- Terrain and e-bike come from Strava's `sport_type` (MountainBikeRide, GravelRide, EBikeRide...), or else the bike's type.

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

- `src/app/api/mapmyride/token-exchange/route.ts` and `src/app/strava/page.tsx` are empty files.
- Some admin seeders may be inactive. Verify before editing.

## Migration history notes

- `008` was originally `enable_rls_on_metadata_tables` (it caused problems and was removed). The database recorded `add_import_text_feedback` as 008, confirmed 2026-10-16, so the old rules were never applied.
- Some policies were created in the dashboard rather than in migrations (for example `component_replacement_events_select_own`). Check `pg_policies` on the live DB before assuming the migrations describe everything.
- `npx tsc` can fail on stale `.next/types` after a build. Delete `.next/types` and re-run.
