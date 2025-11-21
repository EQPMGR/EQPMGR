

'use server';

import { getServerDb } from '@/backend';
import type { UserComponent, MasterComponent, MaintenanceLog } from '@/lib/types';


// Helper to create a slug from a component's details
const createComponentId = (component: Omit<MasterComponent, 'id' | 'embedding'>) => {
    const idString = [component.brand, component.name, component.model, component.size]
        .filter(Boolean)
        .join('-');
    
    if (!idString) return null;

    return idString
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};


export async function replaceUserComponentAction({
    userId,
    equipmentId,
    userComponentIdToReplace,
    replacementReason,
    newMasterComponentId,
    manualNewComponentData,
}: {
    userId: string;
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
    if (!userId || !equipmentId || !userComponentIdToReplace) {
        throw new Error("Missing required parameters for component replacement.");
    }

    if (!newMasterComponentId && !manualNewComponentData) {
        throw new Error("Either a selected component or manual component data must be provided.");
    }

    const db = await getServerDb();
    const batch = db.batch();
    
    try {
        const componentToReplaceSnap = await db.getDocFromSubcollection<UserComponent>(
            `app_users/${userId}/equipment/${equipmentId}`,
            'components',
            userComponentIdToReplace
        );

        if (!componentToReplaceSnap.exists) {
             throw new Error(`Component with ID ${userComponentIdToReplace} not found.`);
        }
        const componentData = componentToReplaceSnap.data!;

        const masterComponentSnap = await db.getDoc<MasterComponent>('masterComponents', componentData.masterComponentId);
        if (!masterComponentSnap.exists) {
            throw new Error(`Master component ${componentData.masterComponentId} not found.`);
        }
        const masterComponentToReplace = { id: masterComponentSnap.id, ...masterComponentSnap.data } as MasterComponent;

        const equipmentDocSnap = await db.getDocFromSubcollection(
            `app_users/${userId}`,
            'equipment',
            equipmentId
        );
        if (!equipmentDocSnap.exists) {
            throw new Error("Equipment not found in user data.");
        }
        const equipmentData = equipmentDocSnap.data;

        // 1. Archive the old component data, ensuring no undefined values.
        const archivedComponent = {
            name: masterComponentToReplace.name,
            brand: masterComponentToReplace.brand || null,
            series: masterComponentToReplace.series || null,
            model: masterComponentToReplace.model || null,
            system: masterComponentToReplace.system,
            size: componentData.size || masterComponentToReplace.size || null,
            wearPercentage: componentData.wearPercentage,
            purchaseDate: componentData.purchaseDate instanceof Date ? componentData.purchaseDate.toISOString() : new Date(componentData.purchaseDate).toISOString(),
            lastServiceDate: componentData.lastServiceDate ? (componentData.lastServiceDate instanceof Date ? componentData.lastServiceDate.toISOString() : new Date(componentData.lastServiceDate).toISOString()) : null,
            replacedOn: new Date().toISOString(),
            finalMileage: equipmentData?.totalDistance || 0,
            replacementReason: replacementReason,
        };

        let finalNewMasterComponentId: string;
        let newComponentSize: string | undefined;
        let newComponentDetails: Omit<MasterComponent, 'id' | 'embedding'>;


        // 2. Determine the details of the new master component (either existing or manual).
        if (newMasterComponentId) {
            finalNewMasterComponentId = newMasterComponentId;
            const newMasterCompDoc = await db.getDoc<MasterComponent>('masterComponents', finalNewMasterComponentId);
            if (!newMasterCompDoc.exists) {
                throw new Error("Selected replacement component not found in database.");
            }
            const masterData = newMasterCompDoc.data!;
            newComponentSize = masterData.size;
            newComponentDetails = {
                name: masterData.name,
                brand: masterData.brand,
                model: masterData.model,
                series: masterData.series,
                size: masterData.size,
                system: masterData.system,
            };
        } else if (manualNewComponentData) {
            newComponentDetails = {
                name: masterComponentToReplace.name,
                brand: manualNewComponentData.brand,
                series: manualNewComponentData.series,
                model: manualNewComponentData.model,
                size: manualNewComponentData.size,
                system: masterComponentToReplace.system,
            };
            const generatedId = createComponentId(newComponentDetails);
            if (!generatedId) {
                throw new Error("Could not generate a valid ID for the new manual component.");
            }
            finalNewMasterComponentId = generatedId;
            newComponentSize = manualNewComponentData.size;

            // Ensure no undefined values are written for the new master component
            const cleanNewComponentDetails = Object.fromEntries(
                Object.entries(newComponentDetails).filter(([_, v]) => v !== undefined)
            );

            batch.set('masterComponents', finalNewMasterComponentId, cleanNewComponentDetails, { merge: true });
        } else {
            throw new Error("No new component data provided.");
        }

        // 3. Create the maintenance log entry for the replacement.
        const newLogEntry: MaintenanceLog = {
            id: db.generateId(), // Generate a unique ID
            date: new Date(),
            logType: replacementReason === 'failure' ? 'repair' : 'modification',
            description: `Replaced ${masterComponentToReplace.name}.`,
            cost: 0,
            serviceType: 'diy',
            componentReplaced: true,
            isOEM: newComponentDetails.brand === masterComponentToReplace.brand,
            replacementPart: `${newComponentDetails.brand || ''} ${newComponentDetails.series || ''} ${newComponentDetails.model || ''}`.trim(),
            notes: `Original part was ${masterComponentToReplace.brand} ${masterComponentToReplace.model}. Reason: ${replacementReason}.`
        };


        // 4. Update the equipment document with the archived component and the new log entry.
        batch.updateInSubcollection(
            `app_users/${userId}`,
            'equipment',
            equipmentId,
            {
                archivedComponents: db.arrayUnion(archivedComponent),
                maintenanceLog: db.arrayUnion(newLogEntry)
            }
        );

        // 5. Update the user's component subcollection with the new component's data.
        const newUserComponentData: Omit<UserComponent, 'id'> = {
            masterComponentId: finalNewMasterComponentId,
            wearPercentage: 0,
            purchaseDate: new Date(),
            lastServiceDate: null,
            notes: `Replaced on ${new Date().toLocaleDateString()}`,
            size: newComponentSize || undefined,
        };

        // Ensure no undefined values are written to the user component document
        const cleanData = Object.fromEntries(Object.entries(newUserComponentData).filter(([_, v]) => v !== undefined));
        batch.setInSubcollection(
            `app_users/${userId}/equipment/${equipmentId}`,
            'components',
            userComponentIdToReplace,
            cleanData
        );

        await batch.commit();

        return { success: true, message: "Component replaced and archived successfully." };

    } catch (error) {
        console.error("[SERVER ACTION ERROR] in replaceUserComponentAction:", error);
        if ((error as any).code === 'permission-denied' || (error as any).code === 7) {
            throw new Error('A permission error occurred. This may be due to Firestore security rules.');
        }
        throw new Error((error as Error).message || 'An unexpected error occurred.');
    }
}

export async function deleteUserComponentAction({
    userId,
    equipmentId,
    userComponentId,
}: {
    userId: string;
    equipmentId: string;
    userComponentId: string;
}) {
    if (!userId || !equipmentId || !userComponentId) {
        throw new Error("Missing required parameters for component deletion.");
    }

    const db = await getServerDb();
    const batch = db.batch();

    try {
        batch.deleteInSubcollection(
            `app_users/${userId}/equipment/${equipmentId}`,
            'components',
            userComponentId
        );
        await batch.commit();
        return { success: true, message: "Component deleted successfully." };

    } catch(error) {
        console.error("[SERVER ACTION ERROR] in deleteUserComponentAction:", error);
        if ((error as any).code === 'permission-denied' || (error as any).code === 7) {
            throw new Error('A permission error occurred. This may be due to backend security rules.');
        }
        throw new Error((error as Error).message || 'An unexpected error occurred.');
    }
}


export async function addUserComponentAction({
    userId,
    equipmentId,
    masterComponentId,
    system,
     manualNewComponentData,
}: {
    userId: string;
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
    if (!userId || !equipmentId || (!masterComponentId && !manualNewComponentData)) {
        throw new Error("Missing required parameters for adding a component.");
    }

    let finalMasterComponentId: string;
    let newComponentSize: string | undefined;

    const db = await getServerDb();
    const batch = db.batch();

    // Logic to handle manual entry vs. selection from DB
    if (manualNewComponentData && manualNewComponentData.brand) {
        const newComponentDetails: Omit<MasterComponent, 'id' | 'embedding'> = {
            name: manualNewComponentData.name,
            brand: manualNewComponentData.brand,
            series: manualNewComponentData.series,
            model: manualNewComponentData.model,
            size: manualNewComponentData.size,
            system: system,
        };
        const generatedId = createComponentId(newComponentDetails);
        if (!generatedId) {
            throw new Error("Could not generate a valid ID for the new manual component.");
        }
        finalMasterComponentId = generatedId;
        newComponentSize = manualNewComponentData.size;

        const cleanNewComponentDetails = Object.fromEntries(
            Object.entries(newComponentDetails).filter(([_, v]) => v !== undefined && v !== '')
        );

        batch.set('masterComponents', finalMasterComponentId, cleanNewComponentDetails, { merge: true });

    } else if (masterComponentId) {
        finalMasterComponentId = masterComponentId;
        const masterComponentSnap = await db.getDoc<MasterComponent>('masterComponents', finalMasterComponentId);
        if (!masterComponentSnap.exists) {
            throw new Error("The selected master component does not exist.");
        }
        newComponentSize = masterComponentSnap.data?.size;
    } else {
        throw new Error("No component data provided.");
    }

    try {
        const newComponentId = db.generateId();

        const newComponentData: Omit<UserComponent, 'id'> = {
            masterComponentId: finalMasterComponentId,
            wearPercentage: 0,
            purchaseDate: new Date(),
            lastServiceDate: null,
            size: newComponentSize,
            notes: `Added on ${new Date().toLocaleDateString()}`,
        };

        const cleanData: {[k:string]: any} = {};
        for(const key in newComponentData) {
            if((newComponentData as any)[key] !== undefined) {
                cleanData[key] = (newComponentData as any)[key]
            }
        }

        batch.setInSubcollection(
            `app_users/${userId}/equipment/${equipmentId}`,
            'components',
            newComponentId,
            cleanData
        );
        await batch.commit();

        return { success: true, message: "Component added successfully." };
    } catch (error) {
        console.error("[ACTION ERROR] in addUserComponentAction:", error);
        throw new Error((error as Error).message || "An unexpected error occurred while adding the component.");
    }
}
