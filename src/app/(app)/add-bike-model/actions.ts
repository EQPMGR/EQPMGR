'use server';

import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken, verifyUserToken } from '@/lib/server-auth';
import type { AddBikeModelFormValues } from './page';
import type { MasterComponent } from '@/lib/types';
import { convertKeysToSnakeCase, saveBikeModel } from '@/lib/bike-model-save';

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

export async function saveBikeModelAction({
    idToken,
    values,
    catalogOnly = false,
}: {
    idToken: string;
    values: AddBikeModelFormValues;
    /** Admins only: add to the shared catalog without adding the bike to their garage. */
    catalogOnly?: boolean;
}): Promise<{ success: boolean; message: string }> {

    try {
        const { uid } = catalogOnly ? await verifyAdminToken(idToken) : await verifyUserToken(idToken);
        const supabase = getSupabaseClient();
        await saveBikeModel(supabase, { uid, values, addToGarage: !catalogOnly });

        return {
            success: true,
            message: `${values.brand} ${values.model} (${values.modelYear}) has been added to the ${catalogOnly ? 'catalog' : 'database'}.`
        };
    } catch (error: any) {
        console.error("Failed to save bike model via server action:", error);
        return {
            success: false,
            message: error.message || 'An unexpected error occurred while saving the bike model.'
        };
    }
}

export async function updateMasterComponentAndSyncUsers({
    idToken,
    masterComponentId,
    updates
}: {
    idToken: string;
    masterComponentId: string;
    updates: Partial<MasterComponent>;
}) {
    await verifyAdminToken(idToken);

    if (!masterComponentId) {
        throw new Error('Master component ID is required.');
    }

    const supabase = getSupabaseClient();

    try {
        // 1. Verify master component exists
        const { data: existingMaster, error: fetchError } = await supabase
          .from('master_components')
          .select('id')
          .eq('id', masterComponentId)
          .single();

        if (fetchError) throw fetchError;
        if (!existingMaster) {
            throw new Error('Master component not found.');
        }

        // Convert updates to snake_case
        const snakeCaseUpdates = convertKeysToSnakeCase(updates);

        // 2. Update master component
        const { error: updateError } = await supabase
          .from('master_components')
          .update(snakeCaseUpdates)
          .eq('id', masterComponentId);
        if (updateError) throw updateError;

        // 3. Find all user components using this master component that weren't user-replaced
        const { data: userComponents, error: queryError } = await supabase
          .from('components')
          .select('id, replaced_by_user')
          .eq('master_component_id', masterComponentId);

        if (queryError) throw queryError;

        // 4. Update user components (only those not replaced by user)
        for (const component of userComponents || []) {
            if (!component.replaced_by_user) {
                const transformedUpdate: any = {};
                if (updates.brand !== undefined) transformedUpdate.brand = updates.brand;
                if (updates.series !== undefined) transformedUpdate.series = updates.series;
                if (updates.model !== undefined) transformedUpdate.model = updates.model;
                if (updates.size !== undefined) transformedUpdate.size = updates.size;

                if (Object.keys(transformedUpdate).length > 0) {
                    const { error: compError } = await supabase
                      .from('components')
                      .update(convertKeysToSnakeCase(transformedUpdate))
                      .eq('id', component.id);
                    if (compError) throw compError;
                }
            }
        }

        return { success: true, message: 'Master component updated and user components synchronized where appropriate.' };
    } catch (error: any) {
        console.error('[ERROR] updateMasterComponentAndSyncUsers:', error);
        throw new Error(error.message || 'Failed to update master component');
    }
}
