

'use server';

import { getServerDb, getServerAuth } from '@/backend';
import type { AddBikeModelFormValues } from './page';
import type { MasterComponent, UserComponent } from '@/lib/types';
import { z } from 'zod';
import { createComponentSlug, getCanonicalComponentKey, findExistingMasterComponent } from '@/lib/master-component-utils';

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

        const db = await getServerDb();
        const batch = db.batch();

        const bikeModelId = db.generateId();
        const equipmentId = db.generateId();
        const bikeModelSlug = createBikeModelSlug(values);

        const masterComponentCache = new Map<string, string>();
        const bikeModelComponentRows: Array<{ id: string; data: Record<string, any> }> = [];
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
                const existingMaster = await findExistingMasterComponent(db, componentToSave);
                if (existingMaster) {
                    masterComponentId = existingMaster.id;
                } else {
                    masterComponentId = db.generateId();
                    const componentSlug = createComponentSlug(componentToSave as Partial<MasterComponent>);
                    batch.set('masterComponents', masterComponentId, {
                        ...componentToSave,
                        slug: componentSlug || undefined,
                    }, { merge: true });
                }
                masterComponentCache.set(canonicalKey, masterComponentId);
            }

            const bikeModelComponentId = db.generateId();
            bikeModelComponentRows.push({
                id: bikeModelComponentId,
                data: {
                    bikeModelId,
                    masterComponentId,
                    componentName: componentToSave.name,
                    system: componentToSave.system,
                    position: componentToSave.name,
                    size: componentToSave.size,
                    chainring1: componentToSave.chainring1,
                    chainring2: componentToSave.chainring2,
                    chainring3: componentToSave.chainring3,
                }
            });

            const userComponentId = db.generateId();
            userComponentRows.push({
                id: userComponentId,
                data: {
                    equipmentId,
                    equipment_id: equipmentId,
                    userId: uid,
                    user_id: uid,
                    masterComponentId,
                    master_component_id: masterComponentId,
                    name: componentToSave.name,
                    size: componentToSave.size,
                    purchaseDate: null,
                    purchase_date: null,
                    notes: null,
                    wearPercentage: 0,
                    wear_percentage: 0,
                    lastServiceDate: null,
                    last_service_date: null,
                    installedAtDistance: 0,
                    installed_at_distance: 0,
                    currentDistance: 0,
                    current_distance: 0,
                    expectedReplacementKm: componentToSave.recommendedIntervalKm || componentToSave.replacementIntervalKm || null,
                    expected_replacement_km: componentToSave.recommendedIntervalKm || componentToSave.replacementIntervalKm || null,
                    isActive: true,
                    is_active: true,
                    replacementCount: 0,
                    replacement_count: 0,
                    installedAt: new Date().toISOString(),
                    installed_at: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }
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

        batch.set('bikeModels', bikeModelId, {
            ...bikeModelToSave,
            slug: bikeModelSlug,
            type: values.type,
            createdBy: uid,
            created_by: uid,
            modelYear: values.modelYear,
            model_year: values.modelYear,
            imageUrl: `https://placehold.co/600x400.png`,
            image_url: `https://placehold.co/600x400.png`,
            createdAt: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        // Link this bike model into the user's personal equipment inventory.
        batch.set('equipment', equipmentId, {
            userId: uid,
            user_id: uid,
            appUserId: uid,
            app_user_id: uid,
            name: `${values.brand || ''} ${values.model || ''}`.trim(),
            type: values.type,
            brand: values.brand,
            model: values.model,
            modelYear: values.modelYear,
            model_year: values.modelYear,
            serialNumber: null,
            serial_number: null,
            frameSize: null,
            frame_size: null,
            purchaseDate: null,
            purchase_date: null,
            purchasePrice: null,
            purchase_price: null,
            totalDistance: 0,
            total_distance: 0,
            totalHours: 0,
            total_hours: 0,
            imageUrl: `https://placehold.co/600x400.png`,
            image_url: `https://placehold.co/600x400.png`,
            maintenanceLog: null,
            maintenance_log: null,
            associatedEquipmentIds: null,
            associated_equipment_ids: null,
            createdAt: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            masterBikeModelId: bikeModelId,
            master_bike_model_id: bikeModelId,
        }, { merge: true });

        for (const row of userComponentRows) {
            batch.set('components', row.id, row.data as any, { merge: true });
        }

        if (values.importFeedback?.rawText || values.importFeedback?.parsedOutput) {
            const { importFeedback: _, ...finalOutput } = values as any;
            const feedbackId = db.generateId();
            batch.set('importTextFeedback', feedbackId, {
                userId: uid,
                user_id: uid,
                bikeModelId,
                bike_model_id: bikeModelId,
                equipmentId,
                equipment_id: equipmentId,
                source: values.importFeedback?.source || 'import-text',
                rawText: values.importFeedback?.rawText || '',
                parsedOutput: values.importFeedback?.parsedOutput || null,
                finalOutput,
                createdAt: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { merge: true });
        }
        
        // --- 3. Commit the main bike model, equipment, components, and master component writes ---
        await batch.commit();

        // 4. If the normalized bike model component join table exists, write those rows too.
        if (bikeModelComponentRows.length > 0) {
            for (const row of bikeModelComponentRows) {
                try {
                    await db.setDoc('bikeModelComponents', row.id, row.data);
                } catch (componentError: any) {
                    console.warn('Could not write bike_model_components row; continuing without normalized bike model component linkage:', componentError?.message || componentError);
                }
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

    const db = await getServerDb();
    const batch = db.batch();

    const existingMaster = await db.getDoc<MasterComponent>('masterComponents', masterComponentId);
    if (!existingMaster.exists) {
        throw new Error('Master component not found.');
    }

    // 1. Update master component attributes
    batch.update('masterComponents', masterComponentId, updates);

    // 2. Propagate to user components unless they were user replaced
    const userComponentSnap = await db.getDocs<UserComponent>('components', {
        type: 'where',
        field: 'master_component_id',
        op: '==',
        value: masterComponentId
    });

    for (const componentDoc of userComponentSnap.docs) {
        const userComp = componentDoc.data;
        if (userComp.replacedByUser) {
            continue;
        }

        const transformedUpdate: Partial<UserComponent> = {};
        if (updates.brand !== undefined) transformedUpdate.brand = updates.brand;
        if (updates.series !== undefined) transformedUpdate.series = updates.series;
        if (updates.model !== undefined) transformedUpdate.model = updates.model;
        if (updates.size !== undefined) transformedUpdate.size = updates.size;

        if (Object.keys(transformedUpdate).length > 0) {
            batch.update('components', componentDoc.id, transformedUpdate as any);
        }
    }

    await batch.commit();

    return { success: true, message: 'Master component updated and user components synchronized where appropriate.' };
}
