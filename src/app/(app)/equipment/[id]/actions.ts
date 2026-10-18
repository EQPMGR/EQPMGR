
'use server';

import { createClient } from '@supabase/supabase-js';
import type { MasterComponent } from '@/lib/types';
import { createComponentSlug } from '@/lib/master-component-utils';
import { verifyUserToken } from '@/lib/server-auth';

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
 * Convert camelCase to snake_case for database operations
 */
function camelToSnake(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Recursively convert object keys from camelCase to snake_case
 */
function convertKeysToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  }

  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      converted[snakeKey] = convertKeysToSnakeCase(value);
    }
    return converted;
  }

  return obj;
}

/**
 * These actions use the service-role key, which bypasses RLS, so ownership must
 * be checked here. Mirrors the equipment RLS policy.
 */
async function assertOwnsEquipment(supabase: ReturnType<typeof getSupabaseClient>, equipmentId: string, userId: string) {
    const { data, error } = await supabase
      .from('equipment')
      .select('id')
      .eq('id', equipmentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Equipment not found.');
}

// Helper to generate UUIDs for new records
function generateId(): string {
  return crypto.randomUUID();
}

export async function replaceUserComponentAction({
    idToken,
    equipmentId,
    userComponentIdToReplace,
    replacementReason,
    newMasterComponentId,
    manualNewComponentData,
    finalStretch,
}: {
    idToken: string;
    equipmentId: string;
    userComponentIdToReplace: string;
    replacementReason: 'failure' | 'modification' | 'upgrade';
    newMasterComponentId?: string | null;
    manualNewComponentData?: {
        brand: string;
        series?: string;
        model?: string;
        size?: string;
    } | null;
    /** Chains: stretch measured at replacement (percent) and the replace-at limit. */
    finalStretch?: { value: number; threshold: number } | null;
}) {
    if (!idToken || !equipmentId || !userComponentIdToReplace) {
        throw new Error("Missing required parameters for component replacement.");
    }

    if (!newMasterComponentId && !manualNewComponentData) {
        throw new Error("Either a selected component or manual component data must be provided.");
    }

    const supabase = getSupabaseClient();
    const { uid: userId } = await verifyUserToken(idToken);
    await assertOwnsEquipment(supabase, equipmentId, userId);
    
    try {
        // Record the outgoing chain's final stretch first; the replacement
        // event picks it up (migration 017).
        if (finalStretch) {
            await insertChainStretch(supabase, {
                componentId: userComponentIdToReplace, equipmentId, userId,
                value: finalStretch.value, threshold: finalStretch.threshold,
                role: 'rider', notes: 'Measured at replacement',
            });
        }

        // All steps run in one transaction in the database, shared with the
        // shop app: swap the part, archive the old one, log it, and record the
        // replacement data (supabase/migrations/015).
        const { error } = await supabase.rpc('replace_component', {
            p_equipment_id: equipmentId,
            p_component_id: userComponentIdToReplace,
            p_reason: replacementReason,
            p_actor_id: userId,
            p_new_master_component_id: newMasterComponentId || null,
            p_manual: manualNewComponentData ? {
                brand: manualNewComponentData.brand,
                series: manualNewComponentData.series || null,
                model: manualNewComponentData.model || null,
                size: manualNewComponentData.size || null,
            } : null,
        });

        if (error) throw error;

        return { success: true, message: "Component replaced and archived successfully." };

    } catch (error) {
        console.error("[SERVER ACTION ERROR] in replaceUserComponentAction:", error);
        throw new Error((error as Error).message || 'An unexpected error occurred.');
    }
}


export async function deleteUserComponentAction({
    idToken,
    equipmentId,
    userComponentId,
}: {
    idToken: string;
    equipmentId: string;
    userComponentId: string;
}) {
    if (!idToken || !equipmentId || !userComponentId) {
        throw new Error("Missing required parameters for component deletion.");
    }

    const supabase = getSupabaseClient();
    const { uid: userId } = await verifyUserToken(idToken);
    await assertOwnsEquipment(supabase, equipmentId, userId);

    try {
        // Fetch equipment and remove component from array
        const { error: deleteError } = await supabase
          .from('components')
          .delete()
          .eq('id', userComponentId)
          .eq('equipment_id', equipmentId);

        if (deleteError) throw deleteError;

        return { success: true, message: "Component deleted successfully." };

    } catch(error) {
        console.error("[SERVER ACTION ERROR] in deleteUserComponentAction:", error);
        if ((error as any).code === 'permission-denied' || (error as any).code === '403') {
            throw new Error('A permission error occurred. This may be due to backend security rules.');
        }
        throw new Error((error as Error).message || 'An unexpected error occurred.');
    }
}


export async function addUserComponentAction({
    idToken,
    equipmentId,
    masterComponentId,
    system,
     manualNewComponentData,
}: {
    idToken: string;
    equipmentId: string;
    masterComponentId: string | null;
    system: string;
     manualNewComponentData?: {
        name: string;
        brand: string;
        series?: string;
        model?: string;
        size?: string;
    } | null;
}) {
    if (!idToken || !equipmentId || (!masterComponentId && !manualNewComponentData)) {
        throw new Error("Missing required parameters for adding a component.");
    }

    let finalMasterComponentId: string;
    let newComponentSize: string | undefined;

    const supabase = getSupabaseClient();
    const { uid: userId } = await verifyUserToken(idToken);
    await assertOwnsEquipment(supabase, equipmentId, userId);

    // Logic to handle manual entry vs. selection from DB
    if (manualNewComponentData && manualNewComponentData.brand) {
        const manualComponentMatch = {
            name: manualNewComponentData.name,
            brand: manualNewComponentData.brand,
            series: manualNewComponentData.series,
            model: manualNewComponentData.model,
            size: manualNewComponentData.size,
            system,
        };

        // Try to find existing master component
        const { data: existingMasters } = await supabase
          .from('master_components')
          .select('*')
          .eq('brand', manualNewComponentData.brand)
          .eq('model', manualNewComponentData.model || null)
          .eq('series', manualNewComponentData.series || null)
          .eq('system', system)
          .limit(1);

        if (existingMasters && existingMasters.length > 0) {
            const existingMaster = existingMasters[0];
            finalMasterComponentId = existingMaster.id;
            newComponentSize = existingMaster.size;
        } else {
            const newComponentDetails: Omit<MasterComponent, 'id' | 'embedding'> = {
                name: manualNewComponentData.name,
                brand: manualNewComponentData.brand,
                series: manualNewComponentData.series,
                model: manualNewComponentData.model,
                size: manualNewComponentData.size,
                system: system,
            };
            finalMasterComponentId = generateId();
            newComponentSize = manualNewComponentData.size;

            const cleanNewComponentDetails = Object.fromEntries(
                Object.entries(newComponentDetails).filter(([_, v]) => v !== undefined && v !== '')
            );
            const componentSlug = createComponentSlug(newComponentDetails);

            const { error: insertError } = await supabase
              .from('master_components')
              .insert([{
                id: finalMasterComponentId,
                ...convertKeysToSnakeCase({
                  ...cleanNewComponentDetails,
                  slug: componentSlug || undefined,
                })
              }]);

            if (insertError) throw insertError;
        }

    } else if (masterComponentId) {
        finalMasterComponentId = masterComponentId;
        const { data: masterComponentSnap, error: masterError } = await supabase
          .from('master_components')
          .select('*')
          .eq('id', finalMasterComponentId)
          .single();

        if (masterError) throw masterError;
        if (!masterComponentSnap) {
            throw new Error("The selected master component does not exist.");
        }
        newComponentSize = masterComponentSnap.size;
    } else {
        throw new Error("No component data provided.");
    }

    try {
        const newComponentId = generateId();

        const newComponentData = {
            id: newComponentId,
            master_component_id: finalMasterComponentId,
            wear_percentage: 0,
            purchase_date: new Date().toISOString(),
            last_service_date: null,
            size: newComponentSize,
            notes: `Added on ${new Date().toLocaleDateString()}`,
        };

        const cleanData: any = {};
        for(const key in newComponentData) {
            if((newComponentData as any)[key] !== undefined) {
                cleanData[key] = (newComponentData as any)[key]
            }
        }

        const { error: insertError } = await supabase
          .from('components')
          .insert([cleanData]);

        if (insertError) throw insertError;

        return { success: true, message: "Component added successfully." };
    } catch (error) {
        console.error("[ACTION ERROR] in addUserComponentAction:", error);
        throw new Error((error as Error).message || "An unexpected error occurred while adding the component.");
    }
}


async function insertChainStretch(
    supabase: ReturnType<typeof getSupabaseClient>,
    m: { componentId: string; equipmentId: string; userId: string; value: number; threshold: number; role: 'rider' | 'shop'; notes?: string }
) {
    if (!(m.value >= 0 && m.value <= 5)) throw new Error('Stretch must be between 0% and 5%.');
    if (![0.5, 0.75, 1].includes(m.threshold)) throw new Error('Unknown chain wear limit.');

    const { data: part, error: partError } = await supabase
      .from('components')
      .select('id, wear_baseline_key')
      .eq('id', m.componentId)
      .eq('equipment_id', m.equipmentId)
      .maybeSingle();
    if (partError) throw partError;
    if (!part) throw new Error('Part not found on this bike.');
    if (part.wear_baseline_key !== 'chain') throw new Error('Stretch can only be recorded for a chain.');

    const { error } = await supabase.from('component_measurements').insert({
        component_id: m.componentId,
        equipment_id: m.equipmentId,
        kind: 'chain_stretch',
        value: m.value,
        threshold: m.threshold,
        measured_by: m.userId,
        measured_by_role: m.role,
        notes: m.notes ?? null,
    });
    if (error) throw error;
}

/** A rider records measured chain stretch; it replaces the estimate for that chain. */
export async function recordChainStretchAction({
    idToken,
    equipmentId,
    componentId,
    value,
    threshold,
}: {
    idToken: string;
    equipmentId: string;
    componentId: string;
    value: number;
    threshold: number;
}): Promise<{ success: boolean; message: string }> {
    try {
        const supabase = getSupabaseClient();
        const { uid } = await verifyUserToken(idToken);
        await assertOwnsEquipment(supabase, equipmentId, uid);
        await insertChainStretch(supabase, { componentId, equipmentId, userId: uid, value, threshold, role: 'rider' });
        const pct = Math.round((value / threshold) * 100);
        return { success: true, message: `Recorded ${value}% stretch: about ${pct}% of the way to replacement.` };
    } catch (error) {
        return { success: false, message: (error as Error).message || 'Could not record the measurement.' };
    }
}
