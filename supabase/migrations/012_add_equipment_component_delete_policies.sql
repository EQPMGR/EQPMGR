-- Allow users to delete their own equipment and component records.
-- This is required because the app's delete flow calls deleteDoc() on equipment,
-- and the database previously allowed select/insert/update but not delete.

-- Equipment delete policy

drop policy if exists equipment_delete_own on equipment;
create policy equipment_delete_own on equipment
  for delete using (
    auth.uid()::uuid = user_id or auth.uid()::uuid = app_user_id
  );

-- Components delete policy.
-- Components rows are owned by the same user and should be deleted when the
-- owning equipment is deleted or when a user removes a component record.

drop policy if exists components_delete_own on components;
create policy components_delete_own on components
  for delete using (
    exists (
      select 1
      from equipment e
      where e.id = components.equipment_id
        and (e.user_id = auth.uid()::uuid or e.app_user_id = auth.uid()::uuid)
    )
  );
