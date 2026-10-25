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
- Distance wear = km × wet × e-bike × hill × rider-weight factors ÷ lifespan for the ride's terrain. Wear can go above 100% (overdue).
  - Hill factor uses metres climbed per km: drivetrain parts ×1.15/1.3/1.5 and brakes ×1.25/1.5/2.0 at 5/15/30 m/km.
  - Weight factor = ((rider kg + bike 12 or 23 kg) / 87) ^ exponent, capped 0.8–1.5. Exponent is 1 for brakes, 0.5 for drivetrain, tires and bearings. Rider weight is snapshotted from `app_users.weight` (kg).
- The `components_set_wear_baseline` trigger sets the baseline and `expected_replacement_km` when a part is added, and resets wear when its catalog part changes. So `replace_component()` and any insert get the right values automatically.
- Learning (migration 017):
  - Parts track `adjusted_km` (road-equivalent km with all factors applied).
  - Wear % = adjusted km ÷ `component_lifespan_km()`, which blends worn-out replacements into the baseline: (n × observed mean + 8 × prior) / (n + 8), level by level from type → brand → series → model, each observation counted once. New `failure` replacements re-judge every part of that type.
  - The latest `component_measurements` chain-stretch reading (since install) overrides the estimate.
  - Replacement events snapshot adjusted km, identity, install time and final stretch.
  - The `report_*` views are service-role only, shown on `/admin/field-data`.
  - Replacement reason `failure` is labelled "Worn out / failed" in the UI; only those count toward lifespans.
- Admin pages must load data in the browser through admin-checked actions or routes, never in server components: the admin gate runs client-side.
- Weather: `src/lib/ride-weather.ts` (WeatherAPI history, about 7 days back). A ride is wet if ≥0.3 mm falls during it or ≥1 mm in the 12 h before. Strava rides use `start_latlng` and `start_date`; manual rides use the browser location, or the rider marks wet/dry.
- Terrain and e-bike come from Strava's `sport_type` (MountainBikeRide, GravelRide, EBikeRide...), or else the bike's type.

## Build bike from text (import)

- `/import-text` → `POST /api/bike-import` → `src/lib/spec-extract.ts`: Claude **Haiku 5.5** (`@anthropic-ai/sdk`, `messages.parse` + a Zod v4 schema; import `z` from `zod/v4`) maps pasted spec-page text to EQPMGR's part slots (the `BASE_COMPONENTS` names the Add Bike Model form uses). Without `ANTHROPIC_API_KEY`, or on any API error or refusal, it falls back to the rule-based `src/lib/bike-parser.ts`.
- `src/lib/catalog-match.ts` matches parts to existing `master_components` by brand + part code. It's used on the review screen and when saving, so imports don't create duplicate catalog parts. It's deliberately conservative: a missed match beats a wrong merge.
- `bike_imports` (migration 019) logs every import (method, tokens, duration). Admin → Field data shows the AI spend.
- **Cost guardrails.** `/api/bike-import` is the ONLY web code path that can spend money on the Anthropic API. Keep it that way: no other route, server action or client code may call Anthropic. (The local admin script below is the one other caller. It runs on Sage's machine only and has the same caps.) (The original Firebase build left AI endpoints open and a bot ran up a $16k bill.) The layers:
  1. A verified login is required.
  2. A rider gets 10 imports per 24 h; admins are exempt. The count fails closed: if it can't be checked, the import is refused.
  3. The whole site gets 100 AI imports per 24 h (env `BIKE_IMPORT_SITE_DAILY_LIMIT`). Past that cap, imports use the free parser.
  4. Input is capped at 30,000 characters and output at 8,000 tokens. The SDK retries once and times out after 90 s.
  5. A log row is reserved before the AI call, so parallel requests count against the limits.
  6. Kill switch: set `BIKE_IMPORT_AI_DISABLED=1` in Netlify to turn AI off; the parser still works.
  7. The Anthropic Console monthly spend limit is the hard ceiling, with auto-reload off.
- Model settings: Haiku 5.5 at effort `medium` (env `SPEC_EFFORT`). Eval 2026-10-18: medium scored 100% at about 6.3k output tokens per page; low scored 98% at about 3.9k, but missed parts and added a phantom one.
- Catalog-only saves: admins can save a bike to the shared catalog without it landing in their garage. That's the switch on the Add Bike Model form, or Admin → Build Catalog Bikes (`/import-text?catalog=1`). The server re-checks admin (`saveBikeModelAction({ catalogOnly })`) and refuses duplicates by slug. The save logic lives in `src/lib/bike-model-save.ts` (`saveBikeModel(supabase, { uid, values, addToGarage })`).
- Bulk catalog import (local, admin): `scripts/catalog-import/run.mts`. Spec pages go in `scripts/catalog-import/pages/*.txt` (gitignored, with optional `brand:/model:/year:/type:` header lines before `---`).
  - `extract` reads each page once with the AI and writes a `.json`, capped by `--max` (default 20, hard max 50), the site-wide cap and the kill switch. Every call is logged in `bike_imports` under the admin.
  - Review or fix the `.json` files.
  - `save` writes them to the catalog as the admin, skipping bikes already there.
  - A separate Claude session can run this as Sage's catalog assistant: find spec pages, save the text, extract, check the results against the pages, then save.
- Accuracy: `npx tsx scripts/bike-import-eval/run.mts` scores the importer against hand-checked fixtures (`--parser` forces the old parser; baseline 57%). Run it after any prompt or schema change. Each AI run costs a fraction of a cent.

## Shop billing (Stripe, built in the shop app)

- Pricing (ROADMAP decision 2026-10-25): C$2 per **Service Ticket**, one per work order, charged when the work order is **created**. Billed monthly for the previous calendar month (Vancouver time). No monthly or setup fee. Promo codes give free tickets (FIRST10 = 10, one code per shop). Riders are always free.
- Migration 020:
  - `shop_billing`: status `setup_needed` / `active` / `past_due` / `paused`, the Stripe customer, free tickets, grace period.
  - `billing_tickets`: one row per work order, written by a `work_orders` trigger.
  - `promo_codes`.
  - Functions: `redeem_promo_code`, `void_billing_ticket` (admin, unbilled tickets only), `billing_cutoff`.
  - Shops can read their own rows but write nothing. Don't put billing fields on `service_providers`: shops can edit that row through RLS. The old `service_providers.stripe_customer_id` column is legacy; `shop_billing` holds the real one.
- A paused shop can't receive work orders: the trigger raises `SHOP_PAUSED`, and `submitWorkOrderAction` shows a friendly message. That action also limits junk tickets: one open request per bike per shop, and 5 requests per rider per 24 h.
- The shop app (`src/lib/billing.ts`):
  - Card setup goes through Stripe Checkout (setup mode). The billing portal handles cards and invoices.
  - `/api/stripe/webhook` processes card added → active, `invoice.payment_failed` → past_due plus 5 days of grace, `invoice.paid` → active.
  - The daily `netlify/functions/billing-daily.mts` calls `/api/billing/run`. That pauses shops whose grace ran out and invoices unbilled tickets, one invoice per shop. It's safe to re-run.
  - Our database is the source of truth; Stripe never counts usage.
- Shop-app env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_TAX_ENABLED=1` once Stripe Tax is set up. Products, prices (lookup keys `service_ticket_cad` / `rental_ticket_cad`) and portal settings come from `scripts/stripe-setup.mts` in the shop repo.

## Strava

- Shared helpers: `src/lib/strava.ts` (token refresh, activity fetch; saves refreshed tokens with the direct client, because the adapter blocks `strava` writes) and `src/lib/strava-sync.ts` (records a Strava activity on a bike, picks the bike, processes webhook events). Don't add exports for these to `'use server'` files.
- Automatic sync (migration 018, `018_strava_sync.sql`):
  - `POST /api/strava/webhook` stores each event in `strava_webhook_events`, replies at once, and processes it in `after()`. Pending or failed events are retried when the rider opens Settings → Apps.
  - The verify token is derived from `STRAVA_CLIENT_SECRET`.
  - The app's single subscription is switched on or off from Admin → "Automatic Strava sync" (live site only).
  - Bike choice: linked `equipment.strava_gear_id` → unique name match with the Strava bike → the rider's only bike; otherwise the ride is left to assign by hand. Assigning by hand links that Strava bike.
  - Not handled yet: activity update/delete events.
- No email: Sage decided (2026-10-18) the app should not email people. Don't add outbound email or notifications without asking.

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
