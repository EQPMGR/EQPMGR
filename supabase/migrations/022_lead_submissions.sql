-- Insurance lead forms (Oasis Pedal Power, Acci7 accident insurance) email the
-- partner inbox. This log limits how often one rider can submit (so the forms
-- can't be used to flood an inbox) and gives Sage a count for invoicing leads.
-- Only the service role reads or writes it.
create table if not exists lead_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  kind text not null check (kind in ('pedal_power', 'acci7')),
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists lead_submissions_user_idx on lead_submissions (user_id, kind, created_at desc);

alter table lead_submissions enable row level security;
revoke all on lead_submissions from anon, authenticated;
