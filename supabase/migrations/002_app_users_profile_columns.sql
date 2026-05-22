-- Add missing profile fields to app_users for settings/profile form

alter table app_users
  add column if not exists photo_url text,
  add column if not exists measurement_system text not null default 'imperial',
  add column if not exists shoe_size_system text not null default 'us-mens',
  add column if not exists distance_unit text not null default 'km',
  add column if not exists date_format text not null default 'MM/DD/YYYY',
  add column if not exists height numeric,
  add column if not exists weight numeric,
  add column if not exists shoe_size numeric,
  add column if not exists birthdate date,
  add column if not exists last_login timestamptz;

-- Ensure upsert supports new columns
create or replace function public.admin_upsert_app_user(
  p_auth_user_id uuid,
  p_email text,
  p_display_name text,
  p_email_verified boolean default false,
  p_phone text default null,
  p_photo_url text default null,
  p_measurement_system text default 'imperial',
  p_shoe_size_system text default 'us-mens',
  p_distance_unit text default 'km',
  p_date_format text default 'MM/DD/YYYY',
  p_height numeric default null,
  p_weight numeric default null,
  p_shoe_size numeric default null,
  p_birthdate date default null
)
returns app_users
language sql
security definer
as $$
insert into app_users (
  id, email, display_name, email_verified, phone, photo_url,
  measurement_system, shoe_size_system, distance_unit, date_format,
  height, weight, shoe_size, birthdate, created_at, updated_at
)
values (
  p_auth_user_id, p_email, p_display_name, p_email_verified, p_phone, p_photo_url,
  p_measurement_system, p_shoe_size_system, p_distance_unit, p_date_format,
  p_height, p_weight, p_shoe_size, p_birthdate, now(), now()
)
on conflict (id) do update
  set email = coalesce(excluded.email, app_users.email),
      display_name = coalesce(excluded.display_name, app_users.display_name),
      email_verified = excluded.email_verified OR app_users.email_verified,
      phone = coalesce(excluded.phone, app_users.phone),
      photo_url = coalesce(excluded.photo_url, app_users.photo_url),
      measurement_system = coalesce(excluded.measurement_system, app_users.measurement_system),
      shoe_size_system = coalesce(excluded.shoe_size_system, app_users.shoe_size_system),
      distance_unit = coalesce(excluded.distance_unit, app_users.distance_unit),
      date_format = coalesce(excluded.date_format, app_users.date_format),
      height = coalesce(excluded.height, app_users.height),
      weight = coalesce(excluded.weight, app_users.weight),
      shoe_size = coalesce(excluded.shoe_size, app_users.shoe_size),
      birthdate = coalesce(excluded.birthdate, app_users.birthdate),
      updated_at = now()
returning *;
$$;
