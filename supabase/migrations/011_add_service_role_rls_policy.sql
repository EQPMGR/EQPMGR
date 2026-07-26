-- Migration 011: Add service-role RLS policy to app_users
-- This allows server-side operations (Strava token exchange, etc.) to write to app_users
-- when authenticated with the service-role key

drop policy if exists app_users_service_role on app_users;
create policy app_users_service_role on app_users
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
