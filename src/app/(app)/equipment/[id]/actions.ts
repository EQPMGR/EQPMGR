
'use server';

import { doc, getDoc, writeBatch, deleteField, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
    
    const batch = writeBatch(db);
    const userDocRef = doc(db, 'users', userId);
    
    try {
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
            throw new Error("User document not found.");
        }
        const userData = userDocSnap.data();
        const equipmentData = userData.equipment?.[equipmentId];
        
        if (!equipmentData) {
            throw new Error("Equipment not found in user data.");
        }
        
        const componentsCollectionRef = collection(db, 'users', userId, 'equipment', equipmentId, 'components');
        const componentToReplaceSnap = await getDoc(doc(componentsCollectionRef, userComponentIdToReplace));
        
        if (!componentToReplaceSnap.exists()) {
             throw new Error(`Component with ID ${userComponentIdToReplace} not found.`);
        }
        const userComponentToReplace = { id: componentToReplaceSnap.id, ...componentToReplaceSnap.data() } as UserComponent;

        const masterComponentSnap = await getDoc(doc(db, 'masterComponents', userComponentToReplace.masterComponentId));
        if (!masterComponentSnap.exists()) {
            throw new Error(`Master component ${userComponentToReplace.masterComponentId} not found.`);
        }
        const masterComponentToReplace = { id: masterComponentSnap.id, ...masterComponentSnap.data() } as MasterComponent;
        
        const archivedComponent: Omit<ArchivedComponent, 'id'> = {
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
        
        const equipmentDocRef = doc(db, 'users', userId, 'equipment', equipmentId);

        const plainArchivedComponent = {
            ...archivedComponent,
            purchaseDate: archivedComponent.purchaseDate.toISOString(),
            lastServiceDate: archivedComponent.lastServiceDate ? archivedComponent.lastServiceDate.toISOString() : null,
            replacedOn: archivedComponent.replacedOn.toISOString(),
        };

        batch.update(equipmentDocRef, {
            archivedComponents: FieldValue.arrayUnion(plainArchivedComponent)
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
            const newMasterComponentRef = doc(db, `masterComponents/${finalNewMasterComponentId}`);
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
        
        batch.set(componentToReplaceSnap.ref, newUserComponentData);
        
        await batch.commit();
        
        return { success: true, message: "Component replaced and archived successfully." };

    } catch (error) {
        console.error("[SERVER ACTION ERROR] in replaceUserComponentAction:", error);
        throw new Error((error as Error).message || 'An unexpected error occurred.');
    }
}
