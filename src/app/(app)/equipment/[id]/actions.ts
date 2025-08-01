
'use server';

import { doc, getDoc, writeBatch, updateDoc, collection, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { adminDb } from '@/lib/firebase-admin';
import type { UserComponent, MasterComponent, ArchivedComponent, Equipment, Component } from '@/lib/types';
import { toDate } from '@/lib/date-utils';

const createComponentId = (component: Partial<Omit<MasterComponent, 'id'>>) => {
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
    componentToReplace, // Pass the entire component object
    newComponentData,
    replacementReason,
}: {
    userId: string;
    equipmentId: string;
    componentToReplace: Omit<Component, 'purchaseDate' | 'lastServiceDate'> & { purchaseDate: string, lastServiceDate: string | null };
    newComponentData: Omit<MasterComponent, 'id'>;
    replacementReason: 'failure' | 'modification' | 'upgrade';
}) {
    if (!userId || !equipmentId || !componentToReplace || !newComponentData || !replacementReason) {
        throw new Error("Missing required parameters for component replacement.");
    }
    
    try {
        const batch = writeBatch(adminDb);
        const equipmentDocRef = doc(adminDb, 'users', userId, 'equipment', equipmentId);

        // 1. Create or get the new master component
        const newMasterComponentId = createComponentId(newComponentData);
        if (!newMasterComponentId) {
            throw new Error("Could not generate a valid ID for the new component.");
        }
        const newMasterComponentRef = doc(adminDb, 'masterComponents', newMasterComponentId);
        batch.set(newMasterComponentRef, newComponentData, { merge: true });

        // 2. Fetch equipment to get total distance
        const equipmentSnap = await getDoc(equipmentDocRef);
        if (!equipmentSnap.exists()) {
            throw new Error("Equipment document not found.");
        }
        const equipmentData = equipmentSnap.data() as Equipment;

        // 3. Archive the old component
        const archivedComponent: Omit<ArchivedComponent, 'id' | 'maintenanceLog'> = {
            ...componentToReplace,
            replacedOn: new Date(),
            finalMileage: equipmentData.totalDistance || 0,
            replacementReason: replacementReason,
            purchaseDate: toDate(componentToReplace.purchaseDate),
            lastServiceDate: componentToReplace.lastServiceDate ? toDate(componentToReplace.lastServiceDate) : null,
        };
        batch.update(equipmentDocRef, {
            archivedComponents: arrayUnion(archivedComponent)
        });

        // 4. Delete the old user component document from the subcollection
        const oldUserCompRef = doc(adminDb, 'users', userId, 'equipment', equipmentId, 'components', componentToReplace.userComponentId);
        batch.delete(oldUserCompRef);

        // 5. Add the new user component document to the subcollection
        const newUserCompRef = doc(collection(adminDb, 'users', userId, 'equipment', equipmentId, 'components'));
        const newUserComponent: Omit<UserComponent, 'id'> = {
            masterComponentId: newMasterComponentId,
            wearPercentage: 0,
            purchaseDate: new Date(),
            lastServiceDate: null,
            notes: `Replaced on ${new Date().toLocaleDateString()}`,
            size: newComponentData.size
        };
        batch.set(newUserCompRef, newUserComponent);

        await batch.commit();
        
        return { success: true };

    } catch (error) {
        console.error("Server Action Error in replaceUserComponentAction:", error);
        // This is where the custom error message is thrown.
        if ((error as any).code === 'PERMISSION_DENIED' || (error as any).code === 7) {
             throw new Error('Server authentication failed. Check your service account credentials and environment variables.');
        }
        throw new Error((error as Error).message || 'An unexpected error occurred.');
    }
}

export async function updateSubComponentsAction() {
    // This action is currently not in use and is a placeholder.
    // The logic has been handled client-side for simplicity.
    console.log("updateSubComponentsAction called, but is not implemented.");
    return { success: true };
}
