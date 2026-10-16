-- Store import-text RLHF feedback for bike model extraction improvements

create table if not exists import_text_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  bike_model_id uuid references bike_models(id) on delete set null,
  equipment_id uuid references equipment(id) on delete set null,
  source text not null default 'import-text',
  raw_text text not null,
  parsed_output jsonb,
  final_output jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_text_feedback_created_at_idx on import_text_feedback(created_at desc);
create index if not exists import_text_feedback_user_id_idx on import_text_feedback(user_id);
create index if not exists import_text_feedback_bike_model_id_idx on import_text_feedback(bike_model_id);

alter table import_text_feedback enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'import_text_feedback'
      and policyname = 'Users can read own import feedback'
  ) then
    create policy "Users can read own import feedback"
      on import_text_feedback
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'import_text_feedback'
      and policyname = 'Users can insert own import feedback'
  ) then
    create policy "Users can insert own import feedback"
      on import_text_feedback
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'import_text_feedback'
      and policyname = 'Service role can manage import feedback'
  ) then
    create policy "Service role can manage import feedback"
      on import_text_feedback
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
