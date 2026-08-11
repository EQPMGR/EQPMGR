
'use server';

import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

/**
 * Merges multiple master components into a single primary component.
 * This function will:
 * 1. Find all equipment documents.
 * 2. For each equipment, check if any components reference the IDs to be merged.
 * 3. If so, update the component references to point to the primary component ID.
 * 4. After updating all references, delete the old (non-primary) master components.
 * @param primaryComponentId The ID of the component to keep.
 * @param idsToMerge The list of component IDs to merge into the primary one.
 */
export async function mergeDuplicateComponents(primaryComponentId: string, idsToMerge: string[]): Promise<{ success: boolean; message: string }> {
  if (!primaryComponentId || !idsToMerge || idsToMerge.length === 0) {
    return { success: false, message: 'Missing primary component ID or IDs to merge.' };
  }

  const supabase = getSupabaseClient();

  try {
    // 1. Find all equipment documents
    const { data: allEquipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, components');

    if (equipmentError) throw equipmentError;

    // 2. Update equipment that reference the components to be merged
    for (const equipment of allEquipment || []) {
      if (equipment.components && Array.isArray(equipment.components)) {
        let needsUpdate = false;
        const updatedComponents = equipment.components.map((component: any) => {
          if (idsToMerge.includes(component.master_component_id || component.masterComponentId)) {
            needsUpdate = true;
            return {
              ...component,
              master_component_id: primaryComponentId,
              masterComponentId: primaryComponentId,
            };
          }
          return component;
        });

        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('equipment')
            .update({ components: updatedComponents })
            .eq('id', equipment.id);

          if (updateError) throw updateError;
        }
      }
    }

    // 3. Delete the old master components (except the primary one)
    const idsToDelete = idsToMerge.filter(id => id !== primaryComponentId);
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('master_components')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;
    }

    return { success: true, message: `Successfully merged ${idsToMerge.length - 1} components into ${primaryComponentId}.` };
  } catch (error: any) {
    console.error('Error merging duplicates:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during merge.' };
  }
}

/**
 * Marks a group of components as not being duplicates.
 * This stores a record in the `ignored_duplicates` table.
 * @param key The unique key representing the duplicate group.
 */
export async function ignoreDuplicateGroup(key: string): Promise<{ success: boolean; message: string }> {
    if (!key) {
        return { success: false, message: 'A group key is required to ignore duplicates.' };
    }

    try {
        const supabase = getSupabaseClient();
        
        const { error } = await supabase
          .from('ignored_duplicates')
          .insert([{
            id: key,
            ignored: true,
            ignored_at: new Date().toISOString(),
          }]);

        if (error) throw error;

        return { success: true, message: `Group "${key}" will be ignored in future scans.` };

    } catch (error: any) {
        console.error('Error ignoring group:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}
