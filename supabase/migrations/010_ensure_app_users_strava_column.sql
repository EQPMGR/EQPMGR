-- Ensure the Strava JSON column exists for app_users
alter table if exists app_users
  add column if not exists strava jsonb;
