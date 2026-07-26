-- Add Strava OAuth data storage to app_users

alter table if exists app_users
  add column if not exists strava jsonb;
