// Server-only: saves a bike model (and its parts) to the shared catalog, and
// optionally to the saver's garage. Used by the Add Bike Model form
// (saveBikeModelAction) and the admin bulk import script
// (scripts/catalog-import). Not a 'use server' module: exports here must not
// become public endpoints.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AddBikeModelFormValues } from '@/app/(app)/add-bike-model/page';
import type { MasterComponent } from '@/lib/types';
import { createComponentSlug, getCanonicalComponentKey } from '@/lib/master-component-utils';
import { matchCatalogParts } from '@/lib/catalog-match';

/**
 * Convert camelCase to snake_case for database operations
 */
function camelToSnake(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Recursively convert object keys from camelCase to snake_case
 */
export function convertKeysToSnakeCase(obj: any): any {
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

export const createBikeModelSlug = (bike: AddBikeModelFormValues) => {
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

async function getUniqueMasterComponentSlug(
  supabase: SupabaseClient,
  baseSlug: string,
  reservedSlugs: Set<string>
): Promise<string> {
  let attempt = 1;
  let slug = baseSlug;

  while (true) {
    if (reservedSlugs.has(slug)) {
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
      continue;
    }

    const { data: existing, error } = await supabase
      .from('master_components')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (existing) {
      reservedSlugs.add(slug);
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
      continue;
    }

    reservedSlugs.add(slug);
    return slug;
  }
}

export type SaveBikeModelResult = { bikeModelId: string; equipmentId: string | null };

/**
 * addToGarage false = catalog only (admins building the catalog): no
 * equipment or user components are created.
 */
export async function saveBikeModel(
    supabase: SupabaseClient,
    { uid, values, addToGarage }: { uid: string; values: AddBikeModelFormValues; addToGarage: boolean }
): Promise<SaveBikeModelResult> {
        if (!addToGarage) {
            const { data: existing, error } = await supabase.from('bike_models').select('id').eq('slug', createBikeModelSlug(values)).maybeSingle();
            if (error) throw error;
            if (existing) throw new Error(`${values.brand} ${values.model} (${values.modelYear}) is already in the catalog.`);
        }

        const bikeModelId = generateId();
        const equipmentId = generateId();
        const bikeModelSlug = createBikeModelSlug(values);

        const masterComponentCache = new Map<string, string>();
        const masterComponentSlugReservations = new Set<string>();
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
            let masterComponentId: string | undefined = masterComponentCache.get(canonicalKey);

            if (!masterComponentId) {
                const componentSlug = createComponentSlug(componentToSave as Partial<MasterComponent>);

                if (componentSlug) {
                    const { data: existingBySlug, error: slugError } = await supabase
                      .from('master_components')
                      .select('id')
                      .eq('slug', componentSlug)
                      .maybeSingle();

                    if (!slugError && existingBySlug) {
                        masterComponentId = existingBySlug.id;
                    }
                }

                if (!masterComponentId) {
                    // Reuse an existing catalog part when brand + part code match
                    // (e.g. "Deore XT CN-M8100" vs "XT CN-M8100"); duplicates would
                    // split that part's lifespan data.
                    const [match] = await matchCatalogParts(supabase, [{
                        slot: componentToSave.name,
                        brand: componentToSave.brand,
                        series: componentToSave.series,
                        model: componentToSave.model,
                        system: componentToSave.system,
                    }]);

                    if (match) {
                        masterComponentId = match.part.id;
                    } else {
                        masterComponentId = generateId();
                        const uniqueSlug = componentSlug
                          ? await getUniqueMasterComponentSlug(supabase, componentSlug, masterComponentSlugReservations)
                          : undefined;

                        masterComponentsToInsert.push({
                            id: masterComponentId,
                            data: convertKeysToSnakeCase({
                                ...componentToSave,
                                slug: uniqueSlug,
                            })
                        });
                    }
                }

                masterComponentCache.set(canonicalKey, masterComponentId!);
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

            if (addToGarage) userComponentRows.push({
                id: generateId(),
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
                    // expected_replacement_km is set by the components_set_wear_baseline trigger (migration 016)
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
          brand: values.brand,
          model: values.model,
          model_year: values.modelYear,
          slug: bikeModelSlug,
          image_url: `https://placehold.co/600x400.png`,
          created_by: uid,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        const equipmentInsert = convertKeysToSnakeCase({
            id: equipmentId,
            user_id: uid,
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

        // Insert equipment (garage only)
        if (addToGarage) {
            const { error: equipmentError } = await supabase
              .from('equipment')
              .insert([equipmentInsert]);
            if (equipmentError) throw equipmentError;
        }

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
                equipment_id: addToGarage ? equipmentId : null,
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

        return { bikeModelId, equipmentId: addToGarage ? equipmentId : null };
}
