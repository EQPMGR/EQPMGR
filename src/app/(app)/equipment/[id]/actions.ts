
'use server';

import { doc, getDoc, writeBatch, updateDoc, collection, arrayUnion, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { adminDb } from '@/lib/firebase-admin';
import type { UserComponent, MasterComponent, ArchivedComponent, Equipment } from '@/lib/types';
import { toDate } from '@/lib/date-utils';

const createComponentId = (component: Partial<Omit<MasterComponent, 'id' | 'embedding'>>) => {
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
    
    try {
        const batch = writeBatch(adminDb);
        const equipmentDocRef = doc(adminDb, 'users', userId, 'equipment', equipmentId);

        // 1. Fetch the entire equipment document from the server. This is the source of truth.
        const equipmentSnap = await getDoc(equipmentDocRef);
        if (!equipmentSnap.exists()) {
            throw new Error("Equipment document not found.");
        }
        const equipmentData = equipmentSnap.data() as Equipment;
        
        // Find the component to replace from the subcollection data.
        const componentsCollectionRef = collection(adminDb, 'users', userId, 'equipment', equipmentId, 'components');
        const componentToReplaceSnap = await getDoc(doc(componentsCollectionRef, userComponentIdToReplace));
        
        if (!componentToReplaceSnap.exists()) {
             throw new Error(`Component with ID ${userComponentIdToReplace} not found in equipment's components subcollection.`);
        }
        const userComponentToReplace = { id: componentToReplaceSnap.id, ...componentToReplaceSnap.data() } as UserComponent;

        const masterComponentSnap = await getDoc(doc(adminDb, 'masterComponents', userComponentToReplace.masterComponentId));
        if (!masterComponentSnap.exists()) {
            throw new Error(`Master component ${userComponentToReplace.masterComponentId} not found.`);
        }
        const masterComponentToReplace = { id: masterComponentSnap.id, ...masterComponentSnap.data() } as MasterComponent;
        
        const componentToReplace: Component = {
            ...masterComponentToReplace,
            ...userComponentToReplace,
            userComponentId: userComponentToReplace.id,
            purchaseDate: toDate(userComponentToReplace.purchaseDate),
            lastServiceDate: toNullableDate(userComponentToReplace.lastServiceDate),
        };

        // 2. Create the archive record.
        const archivedComponent: Omit<ArchivedComponent, 'id' | 'maintenanceLog' | 'components' | 'userComponentId'> = {
            name: componentToReplace.name,
            brand: componentToReplace.brand,
            series: componentToReplace.series,
            model: componentToReplace.model,
            system: componentToReplace.system,
            size: componentToReplace.size,
            wearPercentage: componentToReplace.wearPercentage,
            purchaseDate: componentToReplace.purchaseDate,
            lastServiceDate: componentToReplace.lastServiceDate,
            replacedOn: new Date(), // Server-generated timestamp
            finalMileage: equipmentData.totalDistance || 0,
            replacementReason: replacementReason,
        };

        let finalNewMasterComponentId: string;

        if (newMasterIdFromClient) {
            finalNewMasterComponentId = newMasterIdFromClient;
        } else if (manualNewComponentData) {
            const newMasterData: Omit<MasterComponent, 'id' | 'embedding'> = {
                name: componentToReplace.name, // Inherit name from the replaced component
                brand: manualNewComponentData.brand,
                series: manualNewComponentData.series,
                model: manualNewComponentData.model,
                size: manualNewComponentData.size,
                system: componentToReplace.system,
            };
            const generatedId = createComponentId(newMasterData);
            if (!generatedId) {
                throw new Error("Could not generate a valid ID for the new manual component.");
            }
            finalNewMasterComponentId = generatedId;
            const newMasterComponentRef = doc(adminDb, 'masterComponents', finalNewMasterComponentId);
            batch.set(newMasterComponentRef, newMasterData, { merge: true });
        } else {
            throw new Error("No new component data provided.");
        }

        const newUserComponentData: Omit<UserComponent, 'id'> = {
            masterComponentId: finalNewMasterComponentId,
            wearPercentage: 0,
            purchaseDate: new Date(), // Server-generated timestamp
            lastServiceDate: null,
            notes: `Replaced on ${new Date().toLocaleDateString()}`,
            size: manualNewComponentData?.size,
        };
        
        // --- STAGE 1 IMPLEMENTATION ---
        // Log the prepared data instead of writing it.
        console.log('--- STAGE 1: Replacement Plan ---');
        console.log('Archived Component to be Added:', JSON.stringify(archivedComponent, null, 2));
        console.log('New User Component to be Added:', JSON.stringify(newUserComponentData, null, 2));
        console.log('Old User Component to be Deleted:', userComponentIdToReplace);
        console.log('--- END OF STAGE 1 PLAN ---');
        
        // The batch.commit() is commented out for Stage 1.
        // await batch.commit();
        
        return { success: true, message: "Stage 1: Server successfully prepared the archive record. Check server logs." };

    } catch (error) {
        console.error("[SERVER ACTION ERROR] in replaceUserComponentAction:", error);
        // Ensure we throw the error message so the client can display it.
        throw new Error((error as Error).message || 'An unexpected error occurred.');
    }
}
