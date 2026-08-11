

'use server';

import { createClient } from '@supabase/supabase-js';
import { getServerAuth } from '@/backend';
import type { AddBikeModelFormValues } from './page';
import type { MasterComponent, UserComponent } from '@/lib/types';
import { z } from 'zod';
import { createComponentSlug, getCanonicalComponentKey, findExistingMasterComponent } from '@/lib/master-component-utils';

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

const createBikeModelSlug = (bike: AddBikeModelFormValues) => {
    return `${bike.brand}-${bike.model}-${bike.modelYear}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

const normalizeComponentPayload = (component: Record<string, any>) => {
    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(component)) {
        const lowerKey = key.toLowerCase().trim();

        if (lowerKey === 'chainring 1' || lowerKey === 'chainring-1') {
            normalized.chainring1 = value;
            continue;
        }
        if (lowerKey === 'chainring 2' || lowerKey === 'chainring-2') {
            normalized.chainring2 = value;
            continue;
        }
        if (lowerKey === 'chainring 3' || lowerKey === 'chainring-3') {
            normalized.chainring3 = value;
            continue;
        }

        normalized[key] = value;
    }

    return normalized;
};

// Helper to generate UUIDs for new records
function generateId(): string {
  return crypto.randomUUID();
}


export async function saveBikeModelAction({
    idToken,
    values,
}: {
    idToken: string;
    values: AddBikeModelFormValues;
}): Promise<{ success: boolean; message: string }> {

    try {
        if (!idToken) {
            throw new Error('You must be logged in to save a bike model.');
        }

        // Verify the session is valid.
        const auth = await getServerAuth();
        const decoded = await auth.verifyIdToken(idToken, true);
        const uid = decoded?.uid;
        if (!uid) {
            throw new Error('Invalid auth token.');
        }

        const supabase = getSupabaseClient();

        const bikeModelId = generateId();
        const equipmentId = generateId();
        const bikeModelSlug = createBikeModelSlug(values);

        const masterComponentCache = new Map<string, string>();
        const bikeModelComponentRows: Array<{ id: string; data: Record<string, any> }> = [];
        const masterComponentsToInsert: Array<{ id: string; data: Record<string, any> }> = [];
        const userComponentRows: Array<{ id: string; data: Record<string, any> }> = [];

        for (const originalComponent of values.components) {
            const normalizedComponent = normalizeComponentPayload(originalComponent as Record<string, any>);
            const componentToSave: { [key: string]: any } = {};

            Object.keys(normalizedComponent).forEach((key: any) => {
                const value = normalizedComponent[key];
                if (value !== undefined && value !== null && value !== '' && key !== 'id') {
                    componentToSave[key] = value;
                }
            });

            if (Object.keys(componentToSave).length <= 2) continue;
            if (!componentToSave.brand && !componentToSave.series && !componentToSave.model && !componentToSave.name) continue;
            if (!componentToSave.system) continue;

            const canonicalKey = getCanonicalComponentKey(componentToSave);
            let masterComponentId = masterComponentCache.get(canonicalKey);

            if (!masterComponentId) {
                // For now, using direct Supabase query instead of findExistingMasterComponent
                const { data: existingMasters } = await supabase
                  .from('master_components')
                  .select('id')
                  .eq('brand', componentToSave.brand || null)
                  .eq('model', componentToSave.model || null)
                  .eq('series', componentToSave.series || null)
                  .eq('system', componentToSave.system)
                  .limit(1);

                if (existingMasters && existingMasters.length > 0) {
                    masterComponentId = existingMasters[0].id;
                } else {
                    masterComponentId = generateId();
                    const componentSlug = createComponentSlug(componentToSave as Partial<MasterComponent>);
                    masterComponentsToInsert.push({
                        id: masterComponentId,
                        data: convertKeysToSnakeCase({
                            ...componentToSave,
                            slug: componentSlug || undefined,
                        })
                    });
                }
                masterComponentCache.set(canonicalKey, masterComponentId);
            }

            const bikeModelComponentId = generateId();
            bikeModelComponentRows.push({
                id: bikeModelComponentId,
                data: convertKeysToSnakeCase({
                    bikeModelId,
                    masterComponentId,
                    componentName: componentToSave.name,
                    system: componentToSave.system,
                    position: componentToSave.name,
                    size: componentToSave.size,
                    chainring1: componentToSave.chainring1,
                    chainring2: componentToSave.chainring2,
                    chainring3: componentToSave.chainring3,
                })
            });

            const userComponentId = generateId();
            userComponentRows.push({
                id: userComponentId,
                data: convertKeysToSnakeCase({
                    equipment_id: equipmentId,
                    user_id: uid,
                    master_component_id: masterComponentId,
                    name: componentToSave.name,
                    size: componentToSave.size,
                    purchase_date: null,
                    notes: null,
                    wear_percentage: 0,
                    last_service_date: null,
                    installed_at_distance: 0,
                    current_distance: 0,
                    expected_replacement_km: componentToSave.recommendedIntervalKm || componentToSave.replacementIntervalKm || null,
                    is_active: true,
                    replacement_count: 0,
                    installed_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
            });
        }

        const { components, ...bikeModelData } = values;

        const bikeModelToSave: { [key: string]: any } = {};
        Object.keys(bikeModelData).forEach((key: any) => {
            const typedKey = key as keyof typeof bikeModelData;
            const value = bikeModelData[typedKey];
            if (value !== undefined && value !== null && value !== '') {
                bikeModelToSave[key] = value;
            }
        });

        // Prepare all data with snake_case
        const bikeModelInsert = convertKeysToSnakeCase({
            id: bikeModelId,
            ...bikeModelToSave,
            slug: bikeModelSlug,
            type: values.type,
            created_by: uid,
            model_year: values.modelYear,
            image_url: `https://placehold.co/600x400.png`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        const equipmentInsert = convertKeysToSnakeCase({
            id: equipmentId,
            user_id: uid,
            app_user_id: uid,
            name: `${values.brand || ''} ${values.model || ''}`.trim(),
            type: values.type,
            brand: values.brand,
            model: values.model,
            model_year: values.modelYear,
            serial_number: null,
            frame_size: null,
            purchase_date: null,
            purchase_price: null,
            total_distance: 0,
            total_hours: 0,
            image_url: `https://placehold.co/600x400.png`,
            maintenance_log: null,
            associated_equipment_ids: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            master_bike_model_id: bikeModelId,
        });

        // Insert master components if new ones were created
        if (masterComponentsToInsert.length > 0) {
            const { error } = await supabase
              .from('master_components')
              .insert(masterComponentsToInsert.map(row => ({ id: row.id, ...row.data })));
            if (error) throw error;
        }

        // Insert bike model
        const { error: bikeModelError } = await supabase
          .from('bike_models')
          .insert([bikeModelInsert]);
        if (bikeModelError) throw bikeModelError;

        // Insert equipment
        const { error: equipmentError } = await supabase
          .from('equipment')
          .insert([equipmentInsert]);
        if (equipmentError) throw equipmentError;

        // Insert user components
        if (userComponentRows.length > 0) {
            const { error: componentError } = await supabase
              .from('components')
              .insert(userComponentRows.map(row => ({ id: row.id, ...row.data })));
            if (componentError) throw componentError;
        }

        // Insert import feedback if provided
        if (values.importFeedback?.rawText || values.importFeedback?.parsedOutput) {
            const { importFeedback: _, ...finalOutput } = values as any;
            const feedbackId = generateId();
            const feedbackInsert = convertKeysToSnakeCase({
                id: feedbackId,
                user_id: uid,
                bike_model_id: bikeModelId,
                equipment_id: equipmentId,
                source: values.importFeedback?.source || 'import-text',
                raw_text: values.importFeedback?.rawText || '',
                parsed_output: values.importFeedback?.parsedOutput || null,
                final_output: finalOutput,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            const { error: feedbackError } = await supabase
              .from('import_text_feedback')
              .insert([feedbackInsert]);
            if (feedbackError) throw feedbackError;
        }

        // Insert bike model components (separate table, not critical if fails)
        if (bikeModelComponentRows.length > 0) {
            const { error: bikeModelComponentError } = await supabase
              .from('bike_model_components')
              .insert(bikeModelComponentRows.map(row => ({ id: row.id, ...row.data })));
            if (bikeModelComponentError) {
                console.warn('Could not write bike_model_components rows; continuing without normalized bike model component linkage:', bikeModelComponentError?.message);
            }
        }

        return {
            success: true,
            message: `${values.brand} ${values.model} (${values.modelYear}) has been added to the database.`
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
    masterComponentId,
    updates
}: {
    masterComponentId: string;
    updates: Partial<MasterComponent>;
}) {
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
