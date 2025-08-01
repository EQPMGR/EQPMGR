
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
    userComponentIdToReplace,
    newComponent,
    replacementReason,
}: {
    userId: string;
    equipmentId: string;
    userComponentIdToReplace: string;
    newComponent: {
        brand?: string;
        series?: string;
        model?: string;
        size?: string;
    };
    replacementReason: 'failure' | 'modification' | 'upgrade';
}) {
    if (!userId || !equipmentId || !userComponentIdToReplace || !newComponent || !replacementReason) {
        throw new Error("Missing required parameters for component replacement.");
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
        
        // Find the component to replace from the subcollection data within the equipment doc.
        const componentsCollectionRef = collection(adminDb, 'users', userId, 'equipment', equipmentId, 'components');
        const componentToReplaceSnap = await getDoc(doc(componentsCollectionRef, userComponentIdToReplace));
        
        if (!componentToReplaceSnap.exists()) {
             throw new Error(`Component with ID ${userComponentIdToReplace} not found in equipment.`);
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
        }

        // 2. Create or get the new master component from the primitive data
        const newMasterData: Omit<MasterComponent, 'id' | 'embedding'> = {
            name: componentToReplace.name,
            brand: newComponent.brand,
            series: newComponent.series,
            model: newComponent.model,
            size: newComponent.size,
            system: componentToReplace.system,
        };

        const newMasterComponentId = createComponentId(newMasterData);
        if (!newMasterComponentId) {
            throw new Error("Could not generate a valid ID for the new component.");
        }
        const newMasterComponentRef = doc(adminDb, 'masterComponents', newMasterComponentId);
        batch.set(newMasterComponentRef, newMasterData, { merge: true });

        // 3. Archive the old component using server-fetched data
        // Make sure to use only primitive values for the archived object
        const archivedComponent: Omit<ArchivedComponent, 'id' | 'maintenanceLog' | 'components' | 'userComponentId'> = {
            name: componentToReplace.name,
            brand: componentToReplace.brand,
            series: componentToReplace.series,
            model: componentToReplace.model,
            system: componentToReplace.system,
            size: componentToReplace.size,
            wearPercentage: componentToReplace.wearPercentage,
            purchaseDate: toDate(componentToReplace.purchaseDate), // convert to JS Date
            lastServiceDate: componentToReplace.lastServiceDate ? toDate(componentToReplace.lastServiceDate) : null,
            replacedOn: new Date(),
            finalMileage: equipmentData.totalDistance || 0,
            replacementReason: replacementReason,
        };

        batch.update(equipmentDocRef, {
            archivedComponents: arrayUnion(archivedComponent)
        });

        // 4. Delete the old user component document from the subcollection
        const oldUserCompRef = doc(adminDb, 'users', userId, 'equipment', equipmentId, 'components', userComponentIdToReplace);
        batch.delete(oldUserCompRef);

        // 5. Add the new user component document to the subcollection
        const newUserCompRef = doc(collection(adminDb, 'users', userId, 'equipment', equipmentId, 'components'));
        const newUserComponent: Omit<UserComponent, 'id'> = {
            masterComponentId: newMasterComponentId,
            wearPercentage: 0,
            purchaseDate: new Date(),
            lastServiceDate: null,
            notes: `Replaced on ${new Date().toLocaleDateString()}`,
            size: newComponent.size
        };
        batch.set(newUserCompRef, newUserComponent);

        await batch.commit();
        
        return { success: true };

    } catch (error) {
        console.error("Server Action Error in replaceUserComponentAction:", error);
        if ((error as any).code === 'PERMISSION_DENIED' || (error as any).code === 7 || (error as any).message?.includes('access token')) {
             throw new Error('Server authentication failed. Check your service account credentials and environment variables.');
        }
        throw new Error((error as Error).message || 'An unexpected error occurred.');
    }
}
