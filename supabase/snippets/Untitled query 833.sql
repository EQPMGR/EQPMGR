alter table app_users enable row level security;

create policy if not exists app_users_select_own
  on app_users
  for select
  using (id = auth.uid()::uuid);

create policy if not exists app_users_insert_own
  on app_users
  for insert
  with check (id = auth.uid()::uuid);

create policy if not exists app_users_update_own
  on app_users
  for update
  using (id = auth.uid()::uuid)
  with check (id = auth.uid()::uuid);
