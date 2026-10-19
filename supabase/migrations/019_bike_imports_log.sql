-- Migration 019: log every "build bike from text" import.
-- Used for the per-rider daily limit (AI extraction costs money), for cost
-- tracking, and to measure accuracy over time. Service role only.

create table if not exists bike_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  method text not null check (method in ('ai', 'parser')),
  model text,
  input_chars int not null,
  input_tokens int,
  output_tokens int,
  duration_ms int,
  parts_found int,
  parts_matched int,
  fallback_reason text
);

create index if not exists bike_imports_user_day_idx on bike_imports (user_id, created_at desc);

alter table bike_imports enable row level security;
revoke all on bike_imports from anon, authenticated;
