
'use server';

import { doc, getDoc, writeBatch, updateDoc, collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserComponent, MasterComponent } from '@/lib/types';
import { toDate } from '@/lib/date-utils';

// Helper to create a slug from a component's details
const createComponentId = (component: Omit<MasterComponent, 'id'>) => {
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
    newComponentData
}: {
    userId: string;
    equipmentId: string;
    userComponentIdToReplace: string;
    newComponentData: Omit<MasterComponent, 'id'>;
}) {
    if (!userId || !equipmentId || !userComponentIdToReplace || !newComponentData) {
        throw new Error("Missing required parameters for component replacement.");
    }
    
    const batch = writeBatch(db);

    // 1. Create or get the new master component
    const newMasterComponentId = createComponentId(newComponentData);
    if (!newMasterComponentId) {
        throw new Error("Could not generate a valid ID for the new component.");
    }
    const newMasterComponentRef = doc(db, 'masterComponents', newMasterComponentId);
    batch.set(newMasterComponentRef, newComponentData, { merge: true });

    // 2. Update the user's component document
    const userComponentDocRef = doc(db, 'users', userId, 'equipment', equipmentId, 'components', userComponentIdToReplace);
    
    batch.update(userComponentDocRef, {
        masterComponentId: newMasterComponentId,
        wearPercentage: 0,
        purchaseDate: new Date(),
        lastServiceDate: null,
        notes: `Replaced on ${new Date().toLocaleDateString()}`,
    });

    await batch.commit();

    return { success: true, newMasterComponentId };
}


export async function updateSubComponentsAction({
  userId,
  equipmentId,
  parentUserComponentId,
  subComponentsData,
}: {
  userId: string;
  equipmentId: string;
  parentUserComponentId: string;
  subComponentsData: {
    name: string;
    brand?: string;
    model?: string;
  }[];
}) {
    if (!userId || !equipmentId || !parentUserComponentId) {
        throw new Error('Missing required parameters for sub-component update.');
    }

    const masterComponentBatch = writeBatch(db);
    const newMasterComponentRefs: { masterComponentId: string, data: Omit<MasterComponent, 'id'> }[] = [];

    // --- Step 1: Prepare master components ---
    for (const subCompData of subComponentsData) {
        if (!subCompData.name || !subCompData.name.trim()) continue;

        const masterCompData: Omit<MasterComponent, 'id'> = {
        name: subCompData.name.trim(),
        brand: subCompData.brand?.trim(),
        model: subCompData.model?.trim(),
        system: 'Drivetrain', // Sub-components like chainrings are always Drivetrain
        };
        
        const masterComponentId = createComponentId(masterCompData);
        if (!masterComponentId) continue;

        const masterComponentRef = doc(db, 'masterComponents', masterComponentId);
        masterComponentBatch.set(masterComponentRef, masterCompData, { merge: true });
        newMasterComponentRefs.push({ masterComponentId, data: masterCompData });
    }
    await masterComponentBatch.commit();

    // --- Step 2: Clear old sub-components ---
    const componentsCollectionRef = collection(db, 'users', userId, 'equipment', equipmentId, 'components');
    const q = query(componentsCollectionRef, where('parentUserComponentId', '==', parentUserComponentId));
    const oldSubComponentsSnap = await getDocs(q);
    
    const deleteBatch = writeBatch(db);
    oldSubComponentsSnap.forEach(doc => {
        deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
    
    // --- Step 3: Add new sub-components ---
    const addBatch = writeBatch(db);
    for (const { masterComponentId } of newMasterComponentRefs) {
        const newUserComponentRef = doc(componentsCollectionRef); // Auto-generate ID
        const newUserComponent: UserComponent = {
            id: newUserComponentRef.id,
            masterComponentId,
            parentUserComponentId,
            wearPercentage: 0,
            purchaseDate: new Date(),
            lastServiceDate: null,
            notes: `Added on ${new Date().toLocaleDateString()}`,
        };
        addBatch.set(newUserComponentRef, newUserComponent);
    }
    await addBatch.commit();

    return { success: true };
}
