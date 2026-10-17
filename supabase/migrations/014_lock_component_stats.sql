-- Migration 014: make component statistics server-only.
--
-- These objects hold the aggregated field data EQPMGR plans to sell to
-- manufacturers. They were readable by anyone holding the public anon key
-- (views run as their owner, so RLS on the underlying tables did not apply).
-- Neither app reads them from the browser; server code uses the service role.
-- Access for paying manufacturers will be granted explicitly later.

revoke all on public.component_global_stats_export from anon, authenticated;
revoke all on public.component_manufacturer_comparison from anon, authenticated;
revoke all on public.upgrade_patterns from anon, authenticated;
revoke all on public.component_lifespan_stats from anon, authenticated;

drop policy if exists "Component stats are public" on public.component_lifespan_stats;
