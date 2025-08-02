
'use server';

import { doc, getDoc, writeBatch, updateDoc, collection, arrayUnion } from 'firebase/firestore';
import { adminDb } from '@/lib/firebase-admin';
import type { UserComponent, MasterComponent, ArchivedComponent, Equipment } from '@/lib/types';


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
    
    const batch = writeBatch(adminDb);
    const equipmentDocRef = doc(adminDb, 'users', userId, 'equipment', equipmentId);
    
    try {
        // 1. Fetch all necessary documents from Firestore using the Admin SDK.
        const equipmentSnap = await getDoc(equipmentDocRef);
        if (!equipmentSnap.exists()) {
            throw new Error("Equipment document not found.");
        }
        const equipmentData = equipmentSnap.data() as Equipment;
        
        const componentsCollectionRef = collection(adminDb, 'users', userId, 'equipment', equipmentId, 'components');
        const componentToReplaceSnap = await getDoc(doc(componentsCollectionRef, userComponentIdToReplace));
        
        if (!componentToReplaceSnap.exists()) {
             throw new Error(`Component with ID ${userComponentIdToReplace} not found.`);
        }
        const userComponentToReplace = { id: componentToReplaceSnap.id, ...componentToReplaceSnap.data() } as UserComponent;

        const masterComponentSnap = await getDoc(doc(adminDb, 'masterComponents', userComponentToReplace.masterComponentId));
        if (!masterComponentSnap.exists()) {
            throw new Error(`Master component ${userComponentToReplace.masterComponentId} not found.`);
        }
        const masterComponentToReplace = { id: masterComponentSnap.id, ...masterComponentSnap.data() } as MasterComponent;
        
        // 2. Create the archive record using the server-fetched data.
        const archivedComponent: Omit<ArchivedComponent, 'id' | 'components' | 'userComponentId'> = {
            name: masterComponentToReplace.name,
            brand: masterComponentToReplace.brand,
            series: masterComponentToReplace.series,
            model: masterComponentToReplace.model,
            system: masterComponentToReplace.system,
            size: userComponentToReplace.size || masterComponentToReplace.size,
            wearPercentage: userComponentToReplace.wearPercentage,
            purchaseDate: new Date(userComponentToReplace.purchaseDate),
            lastServiceDate: userComponentToReplace.lastServiceDate ? new Date(userComponentToReplace.lastServiceDate) : null,
            replacedOn: new Date(),
            finalMileage: equipmentData.totalDistance || 0,
            replacementReason: replacementReason,
        };

        // Add the archive record to the equipment document
        batch.update(equipmentDocRef, {
            archivedComponents: arrayUnion(archivedComponent)
        });

        // 3. Determine the master ID for the new component (either selected or manually created).
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
            const newMasterComponentRef = doc(adminDb, 'masterComponents', finalNewMasterComponentId);
            batch.set(newMasterComponentRef, newMasterData, { merge: true });
        } else {
            throw new Error("No new component data provided.");
        }

        // 4. Create the new UserComponent document to replace the old one.
        const newUserComponentData: Omit<UserComponent, 'id'> = {
            masterComponentId: finalNewMasterComponentId,
            wearPercentage: 0,
            purchaseDate: new Date(),
            lastServiceDate: null,
            notes: `Replaced on ${new Date().toLocaleDateString()}`,
            size: manualNewComponentData?.size, // Use manual size if provided
        };
        
        // This replaces the old component's data with the new component's data.
        batch.set(componentToReplaceSnap.ref, newUserComponentData);
        
        await batch.commit();
        
        return { success: true, message: "Component replaced and archived successfully." };

    } catch (error) {
        console.error("[SERVER ACTION ERROR] in replaceUserComponentAction:", error);
        throw new Error((error as Error).message || 'An unexpected error occurred.');
    }
}
