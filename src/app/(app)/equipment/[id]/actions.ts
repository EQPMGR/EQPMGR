
'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import type { UserComponent, MasterComponent } from '@/lib/types';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


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
    
    const batch = adminDb.batch();
    
    try {
        const componentToReplaceRef = adminDb.doc(`users/${userId}/equipment/${equipmentId}/components/${userComponentIdToReplace}`);
        const componentToReplaceSnap = await componentToReplaceRef.get();
        
        if (!componentToReplaceSnap.exists) {
             throw new Error(`Component with ID ${userComponentIdToReplace} not found.`);
        }
        const componentData = componentToReplaceSnap.data() as UserComponent;

        const masterComponentSnap = await adminDb.doc(`masterComponents/${componentData.masterComponentId}`).get();
        if (!masterComponentSnap.exists) {
            throw new Error(`Master component ${componentData.masterComponentId} not found.`);
        }
        const masterComponentToReplace = { id: masterComponentSnap.id, ...masterComponentSnap.data() } as MasterComponent;
        
        const equipmentDocRef = adminDb.doc(`users/${userId}/equipment/${equipmentId}`);
        const equipmentDocSnap = await equipmentDocRef.get();
        if (!equipmentDocSnap.exists) {
            throw new Error("Equipment not found in user data.");
        }
        const equipmentData = equipmentDocSnap.data();

        const archivedComponent = {
            name: masterComponentToReplace.name,
            brand: masterComponentToReplace.brand,
            series: masterComponentToReplace.series,
            model: masterComponentToReplace.model,
            system: masterComponentToReplace.system,
            size: componentData.size || masterComponentToReplace.size || null,
            wearPercentage: componentData.wearPercentage,
            purchaseDate: (componentData.purchaseDate as any).toDate().toISOString(),
            lastServiceDate: componentData.lastServiceDate ? (componentData.lastServiceDate as any).toDate().toISOString() : null,
            replacedOn: new Date().toISOString(),
            finalMileage: equipmentData?.totalDistance || 0,
            replacementReason: replacementReason,
        };
        
        batch.update(equipmentDocRef, {
            archivedComponents: FieldValue.arrayUnion(archivedComponent)
        });

        let finalNewMasterComponentId: string;
        let newComponentSize: string | undefined;

        if (newMasterComponentId) {
            finalNewMasterComponentId = newMasterComponentId;
            const newMasterCompDoc = await adminDb.doc(`masterComponents/${finalNewMasterComponentId}`).get();
            if (newMasterCompDoc.exists) {
                newComponentSize = (newMasterCompDoc.data() as MasterComponent).size;
            }
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
            newComponentSize = manualNewComponentData.size;
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
            size: newComponentSize || undefined,
        };
        
        // Remove undefined properties before writing to Firestore
        const cleanData = Object.fromEntries(Object.entries(newUserComponentData).filter(([_, v]) => v !== undefined));

        batch.set(componentToReplaceRef, cleanData);
        
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
    const batch = adminDb.batch();
    try {
        const componentRef = adminDb.doc(`users/${userId}/equipment/${equipmentId}/components/${userComponentId}`);
        batch.delete(componentRef);
        await batch.commit();
        return { success: true, message: "Component deleted successfully." };

    } catch(error) {
        console.error("[SERVER ACTION ERROR] in deleteUserComponentAction:", error);
        if ((error as any).code === 'permission-denied' || (error as any).code === 7) {
            throw new Error('A permission error occurred. This may be due to Firestore security rules.');
        }
        throw new Error((error as Error).message || 'An unexpected error occurred.');
    }
}


export async function addUserComponentAction({
    userId,
    equipmentId,
    masterComponentId,
    system,
}: {
    userId: string;
    equipmentId: string;
    masterComponentId: string;
    system: string;
}) {
    if (!userId || !equipmentId || !masterComponentId || !system) {
        throw new Error("Missing required parameters for adding a component.");
    }

    try {
        const newComponentRef = doc(collection(db, 'users', userId, 'equipment', equipmentId, 'components'));
        const masterComponentRef = doc(db, 'masterComponents', masterComponentId);
        const masterComponentSnap = await getDoc(masterComponentRef);

        if (!masterComponentSnap.exists()) {
            throw new Error("The selected master component does not exist.");
        }
        const masterComponent = masterComponentSnap.data() as MasterComponent;

        const newComponentData: UserComponent = {
            id: newComponentRef.id,
            masterComponentId: masterComponentId,
            wearPercentage: 0,
            purchaseDate: new Date(),
            lastServiceDate: null,
            size: masterComponent.size,
            notes: `Added on ${new Date().toLocaleDateString()}`,
        };

        await setDoc(newComponentRef, newComponentData);
        
        return { success: true, message: "Component added successfully." };
    } catch (error) {
        console.error("[ACTION ERROR] in addUserComponentAction:", error);
        throw new Error((error as Error).message || "An unexpected error occurred while adding the component.");
    }
}
