
'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import type { UserComponent, MasterComponent } from '@/lib/types';

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
    newMasterComponentId: newMasterIdFromClient,
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
    
    if (!newMasterIdFromClient && !manualNewComponentData) {
        throw new Error("Either a selected component or manual component data must be provided.");
    }
    
    const batch = adminDb.batch();
    
    try {
        const componentToReplaceRef = adminDb.doc(`users/${userId}/equipment/${equipmentId}/components/${userComponentIdToReplace}`);
        const componentToReplaceSnap = await componentToReplaceRef.get();
        
        if (!componentToReplaceSnap.exists) {
             throw new Error(`Component with ID ${userComponentIdToReplace} not found.`);
        }
        // Firestore Timestamps are automatically converted to Date objects by the SDK when fetched this way.
        const componentData = componentToReplaceSnap.data() as Omit<UserComponent, 'purchaseDate' | 'lastServiceDate'> & { purchaseDate: admin.firestore.Timestamp, lastServiceDate: admin.firestore.Timestamp | null };
        const userComponentToReplace = { 
            ...componentData,
            id: componentToReplaceSnap.id,
            purchaseDate: componentData.purchaseDate.toDate(),
            lastServiceDate: componentData.lastServiceDate ? componentData.lastServiceDate.toDate() : null,
        } as UserComponent;

        const masterComponentSnap = await adminDb.doc(`masterComponents/${userComponentToReplace.masterComponentId}`).get();
        if (!masterComponentSnap.exists) {
            throw new Error(`Master component ${userComponentToReplace.masterComponentId} not found.`);
        }
        const masterComponentToReplace = { id: masterComponentSnap.id, ...masterComponentSnap.data() } as MasterComponent;
        
        const equipmentDocRef = adminDb.doc(`users/${userId}/equipment/${equipmentId}`);
        const equipmentDocSnap = await equipmentDocRef.get();
        if (!equipmentDocSnap.exists()) {
            throw new Error("Equipment not found in user data.");
        }
        const equipmentData = equipmentDocSnap.data();

        const archivedComponent = {
            name: masterComponentToReplace.name,
            brand: masterComponentToReplace.brand,
            series: masterComponentToReplace.series,
            model: masterComponentToReplace.model,
            system: masterComponentToReplace.system,
            size: userComponentToReplace.size || masterComponentToReplace.size,
            wearPercentage: userComponentToReplace.wearPercentage,
            purchaseDate: userComponentToReplace.purchaseDate.toISOString(),
            lastServiceDate: userComponentToReplace.lastServiceDate ? userComponentToReplace.lastServiceDate.toISOString() : null,
            replacedOn: new Date().toISOString(),
            finalMileage: equipmentData?.totalDistance || 0,
            replacementReason: replacementReason,
        };
        
        batch.update(equipmentDocRef, {
            archivedComponents: FieldValue.arrayUnion(archivedComponent)
        });

        let finalNewMasterComponentId: string;

        if (newMasterIdFromClient) {
            finalNewMasterComponentId = newMasterIdFromClient;
        } else if (manualNewComponentData) {
            const newMasterData: Omit<MasterComponent, 'id' | 'embedding'> = {
                name: masterComponentToReplace.name,
                brand: manualNewComponentData.brand,
                series: manualNewComponentData.series,
                model: manualNewComponentData.model,
                size: manualNewComponentData.size,
                system: masterComponentToReplace.system,
            };
            const generatedId = createComponentId(newMasterData);
            if (!generatedId) {
                throw new Error("Could not generate a valid ID for the new manual component.");
            }
            finalNewMasterComponentId = generatedId;
            const newMasterComponentRef = adminDb.doc(`masterComponents/${finalNewMasterComponentId}`);
            batch.set(newMasterComponentRef, newMasterData, { merge: true });
        } else {
            throw new Error("No new component data provided.");
        }

        const newUserComponentData: Omit<UserComponent, 'id'> = {
            masterComponentId: finalNewMasterComponentId,
            wearPercentage: 0,
            purchaseDate: new Date(),
            lastServiceDate: null,
            notes: `Replaced on ${new Date().toLocaleDateString()}`,
            size: manualNewComponentData?.size,
        };
        
        batch.set(componentToReplaceRef, newUserComponentData);
        
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
