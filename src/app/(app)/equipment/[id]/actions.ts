
'use server';

import { createClient } from '@supabase/supabase-js';
import type { UserComponent, MasterComponent, MaintenanceLog } from '@/lib/types';
import { findExistingMasterComponent, createComponentSlug } from '@/lib/master-component-utils';
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
 * Convert snake_case to camelCase for application use
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

/**
 * Recursively convert object keys from snake_case to camelCase
 */
function convertKeysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase);
  }

  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      converted[camelKey] = convertKeysToCamelCase(value);
    }
    return converted;
  }

  return obj;
}

/**
 * These actions use the service-role key, which bypasses RLS, so ownership must
 * be checked here. Mirrors the equipment RLS policy (user_id or app_user_id).
 */
async function assertOwnsEquipment(supabase: ReturnType<typeof getSupabaseClient>, equipmentId: string, userId: string) {
    const { data, error } = await supabase
      .from('equipment')
      .select('id')
      .eq('id', equipmentId)
      .or(`user_id.eq.${userId},app_user_id.eq.${userId}`)
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
        // 1. Fetch the component record from the separate components table.
        // Use maybeSingle so a missing component can fall back to legacy equipment.components.
        const { data: componentDataRow, error: componentError } = await supabase
          .from('components')
          .select('*')
          .eq('id', userComponentIdToReplace)
          .eq('equipment_id', equipmentId)
          .maybeSingle();

        if (componentError) {
          // Allow no-result cases to fall through and attempt legacy lookup.
          if (componentError.code !== 'PGRST116') {
            throw componentError;
          }
        }

        let componentToReplace: any = componentDataRow || null;
        let isLegacyEquipmentComponent = false;

        if (!componentToReplace) {
            // Legacy fallback: some older data may still be stored in equipment.components JSON.
            const { data: equipmentDataFallback, error: equipmentFallbackError } = await supabase
              .from('equipment')
              .select('components')
              .eq('id', equipmentId)
              .single();

            if (equipmentFallbackError) {
              throw equipmentFallbackError;
            }

            const legacyComponents = equipmentDataFallback?.components || [];
            const legacyMatch = legacyComponents.find((c: any) =>
              c.id === userComponentIdToReplace || c.user_component_id === userComponentIdToReplace
            );

            if (legacyMatch) {
              console.warn('[Legacy fallback] Found component in equipment.components for ID:', userComponentIdToReplace);
              componentToReplace = legacyMatch;
              isLegacyEquipmentComponent = true;

              const { error: insertLegacyError } = await supabase
                .from('components')
                .insert([{
                  id: userComponentIdToReplace,
                  equipment_id: equipmentId,
                  user_id: userId,
                  parent_user_component_id: legacyMatch.parentUserComponentId || legacyMatch.parent_user_component_id || null,
                  master_component_id: legacyMatch.masterComponentId || legacyMatch.master_component_id,
                  name: legacyMatch.name,
                  wear_percentage: legacyMatch.wearPercentage ?? legacyMatch.wear_percentage ?? 0,
                  purchase_date: legacyMatch.purchaseDate || legacyMatch.purchase_date || null,
                  last_service_date: legacyMatch.lastServiceDate || legacyMatch.last_service_date || null,
                  installed_at_distance: legacyMatch.installedAtDistance || legacyMatch.installed_at_distance || null,
                  current_distance: legacyMatch.currentDistance || legacyMatch.current_distance || null,
                  expected_replacement_km: legacyMatch.expectedReplacementKm || legacyMatch.expected_replacement_km || null,
                  is_active: legacyMatch.isActive ?? legacyMatch.is_active ?? true,
                  replacement_count: legacyMatch.replacementCount || legacyMatch.replacement_count || null,
                  installed_at: legacyMatch.installedAt || legacyMatch.installed_at || null,
                  notes: legacyMatch.notes || null,
                  size: legacyMatch.size || null,
                  wheelset_id: legacyMatch.wheelsetId || legacyMatch.wheelset_id || null,
                  replaced_by_user: legacyMatch.replacedByUser ?? legacyMatch.replaced_by_user ?? null,
                }]);

              if (insertLegacyError) {
                throw insertLegacyError;
              }
            }
        }

        if (!componentToReplace) {
            throw new Error(`Component with ID ${userComponentIdToReplace} not found.`);
        }

        const { data: equipmentData, error: equipmentError } = await supabase
          .from('equipment')
          .select('total_distance, archived_components, maintenance_log')
          .eq('id', equipmentId)
          .single();

        if (equipmentError) throw equipmentError;
        if (!equipmentData) {
            throw new Error("Equipment not found.");
        }

        const componentData = convertKeysToCamelCase(componentToReplace);

        // 2. Fetch the master component that is being replaced
        const { data: masterComponentToReplace, error: masterError } = await supabase
          .from('master_components')
          .select('*')
          .eq('id', componentData.masterComponentId || componentData.master_component_id)
          .single();

        if (masterError) throw masterError;
        if (!masterComponentToReplace) {
            throw new Error(`Master component ${componentData.masterComponentId} not found.`);
        }

        // 3. Archive the old component data
        const archivedComponent = {
            name: masterComponentToReplace.name,
            brand: masterComponentToReplace.brand || null,
            series: masterComponentToReplace.series || null,
            model: masterComponentToReplace.model || null,
            system: masterComponentToReplace.system,
            size: componentData.size || masterComponentToReplace.size || null,
            wear_percentage: componentData.wearPercentage || componentData.wear_percentage || 0,
            purchase_date: componentData.purchaseDate || componentData.purchase_date || null,
            last_service_date: componentData.lastServiceDate || componentData.last_service_date || null,
            replaced_on: new Date().toISOString(),
            final_mileage: equipmentData.total_distance || 0,
            replacement_reason: replacementReason,
        };

        let finalNewMasterComponentId: string;
        let newComponentSize: string | undefined;
        let newComponentDetails: Omit<MasterComponent, 'id' | 'embedding'>;

        // 4. Determine the details of the new master component (either existing or manual)
        if (newMasterComponentId) {
            finalNewMasterComponentId = newMasterComponentId;
            const { data: newMasterComp, error: newMasterError } = await supabase
              .from('master_components')
              .select('*')
              .eq('id', finalNewMasterComponentId)
              .single();

            if (newMasterError) throw newMasterError;
            if (!newMasterComp) {
                throw new Error("Selected replacement component not found in database.");
            }

            newComponentSize = newMasterComp.size;
            newComponentDetails = {
                name: newMasterComp.name,
                brand: newMasterComp.brand,
                model: newMasterComp.model,
                series: newMasterComp.series,
                size: newMasterComp.size,
                system: newMasterComp.system,
            };
        } else if (manualNewComponentData) {
            const manualComponentMatch = {
                name: masterComponentToReplace.name,
                brand: manualNewComponentData.brand,
                series: manualNewComponentData.series,
                model: manualNewComponentData.model,
                size: manualNewComponentData.size,
                system: masterComponentToReplace.system,
            };

            // Try to find existing master component
            const { data: existingMasters } = await supabase
              .from('master_components')
              .select('*')
              .eq('brand', manualNewComponentData.brand || null)
              .eq('model', manualNewComponentData.model || null)
              .eq('series', manualNewComponentData.series || null)
              .eq('system', masterComponentToReplace.system)
              .limit(1);

            if (existingMasters && existingMasters.length > 0) {
                const existingMaster = existingMasters[0];
                finalNewMasterComponentId = existingMaster.id;
                newComponentDetails = {
                    name: existingMaster.name,
                    brand: existingMaster.brand,
                    model: existingMaster.model,
                    series: existingMaster.series,
                    size: existingMaster.size,
                    system: existingMaster.system,
                };
                newComponentSize = existingMaster.size;
            } else {
                newComponentDetails = {
                    name: masterComponentToReplace.name,
                    brand: manualNewComponentData.brand,
                    series: manualNewComponentData.series,
                    model: manualNewComponentData.model,
                    size: manualNewComponentData.size,
                    system: masterComponentToReplace.system,
                };
                finalNewMasterComponentId = generateId();
                const componentSlug = createComponentSlug(newComponentDetails);
                newComponentSize = manualNewComponentData.size;

                const cleanNewComponentDetails = Object.fromEntries(
                    Object.entries(newComponentDetails).filter(([_, v]) => v !== undefined)
                );

                const { error: insertError } = await supabase
                  .from('master_components')
                  .insert([{
                    id: finalNewMasterComponentId,
                    ...convertKeysToSnakeCase({
                      ...cleanNewComponentDetails,
                      slug: componentSlug || undefined,
                    })
                  }]);

                if (insertError) throw insertError;
            }
        } else {
            throw new Error("No new component data provided.");
        }

        // 5. Create the maintenance log entry for the replacement
        const newLogEntry = {
            id: generateId(),
            date: new Date().toISOString(),
            log_type: replacementReason === 'failure' ? 'repair' : 'modification',
            description: `Replaced ${masterComponentToReplace.name}.`,
            cost: 0,
            service_type: 'diy',
            component_replaced: true,
            is_oem: newComponentDetails.brand === masterComponentToReplace.brand,
            replacement_part: `${newComponentDetails.brand || ''} ${newComponentDetails.series || ''} ${newComponentDetails.model || ''}`.trim(),
            notes: `Original part was ${masterComponentToReplace.brand} ${masterComponentToReplace.model}. Reason: ${replacementReason}.`
        };

        // 5a. If this was a failure replacement, update the master component observed interval
        if (replacementReason === 'failure') {
            const installedAtDistance = componentData.installedAtDistance || componentData.installed_at_distance;
            const currentDistance = componentData.currentDistance || componentData.current_distance;
            const equipmentDistance = equipmentData.total_distance;

            let actualIntervalKm: number | null = null;
            if (typeof installedAtDistance === 'number' && typeof currentDistance === 'number') {
                actualIntervalKm = currentDistance - installedAtDistance;
            } else if (typeof installedAtDistance === 'number' && typeof equipmentDistance === 'number') {
                actualIntervalKm = equipmentDistance - installedAtDistance;
            }

            if (actualIntervalKm !== null && actualIntervalKm > 0) {
                const observedCount = masterComponentToReplace.observed_interval_km_count ?? 0;
                const observedAvg = masterComponentToReplace.observed_interval_km_avg ?? 0;
                const updatedCount = observedCount + 1;
                const updatedAvg = observedCount === 0
                    ? actualIntervalKm
                    : (observedAvg * observedCount + actualIntervalKm) / updatedCount;

                const { error: updateMasterError } = await supabase
                  .from('master_components')
                  .update({
                    observed_interval_km_avg: Number(updatedAvg.toFixed(0)),
                    observed_interval_km_count: updatedCount,
                  })
                  .eq('id', masterComponentToReplace.id);

                if (updateMasterError) throw updateMasterError;
            }
        }

        // 6. Update equipment with archived component and new log entry
        const existingArchived = equipmentData.archived_components || [];
        const existingLogs = equipmentData.maintenance_log || [];

        const newUserComponentData = {
            master_component_id: finalNewMasterComponentId,
            wear_percentage: 0,
            purchase_date: new Date().toISOString(),
            last_service_date: null,
            notes: `Replaced on ${new Date().toLocaleDateString()}`,
            size: newComponentSize || undefined,
            replaced_by_user: true,
        };

        const cleanData = Object.fromEntries(Object.entries(newUserComponentData).filter(([_, v]) => v !== undefined));

        const { error: updateComponentError } = await supabase
          .from('components')
          .update(cleanData)
          .eq('id', userComponentIdToReplace)
          .eq('equipment_id', equipmentId);

        if (updateComponentError) throw updateComponentError;

        const { error: updateEquipmentError } = await supabase
          .from('equipment')
          .update({
            archived_components: [...existingArchived, archivedComponent],
            maintenance_log: [...existingLogs, newLogEntry],
          })
          .eq('id', equipmentId);

        if (updateEquipmentError) throw updateEquipmentError;

        return { success: true, message: "Component replaced and archived successfully." };

    } catch (error) {
        console.error("[SERVER ACTION ERROR] in replaceUserComponentAction:", error);
        if ((error as any).code === 'permission-denied' || (error as any).code === '403') {
            throw new Error('A permission error occurred. This may be due to security rules.');
        }
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
