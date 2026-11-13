-- Internal notes a shop keeps on a work order. Separate from work_orders because
-- riders can read that table and must never see these. Only the service role
-- reads or writes it (the shop app's server actions check the shop's login and
-- that the work order is theirs).
create table if not exists work_order_notes (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  author_id uuid not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists work_order_notes_order_idx on work_order_notes (work_order_id, created_at desc);

alter table work_order_notes enable row level security;
revoke all on work_order_notes from anon, authenticated;
