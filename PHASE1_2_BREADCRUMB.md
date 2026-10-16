# EQPMGR Phase 1 & 2 Breadcrumb

## Current Context
- Repo: `EQPMGR-main`
- Backend: Supabase via `src/backend/supabase`
- Current issues:
  - `SupabaseAuthAdapter.verifyIdToken` is failing on server-side fetch/TLS
  - `replaceUserComponentAction` and component flows are inconsistent with `components` storage
  - `masterComponents` fetching currently uses a server-side paginated admin path
- This repo is part of a multi-repo setup. Another app `EQPMGRshop` exists in a sibling folder and shares the same cloud DB.

## Phase 1 goals
1. Stabilize Supabase auth/connectivity for local dev
   - Ensure `NODE_TLS_REJECT_UNAUTHORIZED=0` is safe and only development-only
   - Fix server-side Supabase token verification path
   - Confirm `.env.local` values are loaded correctly on restart
2. Fix component storage and replacement flow
   - Use `components` table as source-of-truth for user-installed components
   - Avoid legacy `equipment.components` JSON array mutations when possible
   - Fix replace/delete/add component actions
3. Stabilize master component fetch
   - Ensure `fetchAllMasterComponents()` works with Supabase and backend permissions
   - Confirm master component schema and UI usage match

## Phase 2 goals
1. Normalize the data model
   - Align `Equipment`, `UserComponent`, and `MasterComponent` types
   - Ensure fields like `wearPercentage`, `installedAtDistance`, `replacementIntervalKm`, and `recommendedIntervalKm` are consistent
2. Complete the core bike maintenance experience
   - Ensure equipment detail page shows components and wear thresholds properly
   - Ensure replacement actions and maintenance log recording work end-to-end
   - Add missing runtime model bindings if needed

## Next startup steps
- Open this repo and continue in the same chat to avoid losing context
- Use this file to reorient a new agent if needed
- Recommended first task:
  1. Confirm the `replaceUserComponentAction` flow is now using `components` correctly
  2. Fix any remaining `component not found` or permissions errors
  3. Confirm server-side Supabase calls now work in local dev

## Notes for a new agent
- Start by reviewing `src/app/(app)/equipment/[id]/actions.ts`
- Then check `src/backend/supabase/SupabaseAuthAdapter.ts` and `src/backend/supabase/SupabaseDbAdapter.ts`
- The app has a strong existing data model in `src/lib/types.ts`
- Good next place to inspect is `src/app/(app)/equipment/[id]/page.tsx`

---

If you restart here, begin by verifying the current local dev server and the status of `replaceUserComponentAction`.
