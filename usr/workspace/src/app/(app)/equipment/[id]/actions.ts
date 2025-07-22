
'use server';

import { doc, getDoc, writeBatch, deleteField, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserComponent, MasterComponent } from '@/lib/types';

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

    // 2. Update the user's equipment data
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
        throw new Error("User document not found.");
    }
    const userData = userDocSnap.data();
    const equipmentData = userData.equipment?.[equipmentId];
    if (!equipmentData) {
        throw new Error("Equipment not found in user data.");
    }

    const currentComponents: UserComponent[] = equipmentData.components || [];
    const componentIndex = currentComponents.findIndex(c => c.id === userComponentIdToReplace);

    if (componentIndex === -1) {
        throw new Error("Component to replace not found in user's equipment.");
    }
    
    const originalComponent = currentComponents[componentIndex];

    // Update the specific user component in the array
    currentComponents[componentIndex] = {
        ...originalComponent,
        masterComponentId: newMasterComponentId,
        wearPercentage: 0, // Reset wear for the new component
        purchaseDate: new Date(), // Set purchase date to now
        lastServiceDate: null,
        notes: `Replaced on ${new Date().toLocaleDateString()}`,
        // Clear old chainring data when replacing the whole crankset
        chainring1: undefined,
        chainring1_brand: undefined,
        chainring1_model: undefined,
        chainring2: undefined,
        chainring2_brand: undefined,
        chainring2_model: undefined,
        chainring3: undefined,
        chainring3_brand: undefined,
        chainring3_model: undefined,
    };

    const updatePayload = {
      [`equipment.${equipmentId}.components`]: currentComponents,
    };

    batch.update(userDocRef, updatePayload);

    // 3. Commit the batch
    await batch.commit();

    return { success: true, newMasterComponentId };
}


export async function updateUserComponentAction({
    userId,
    equipmentId,
    userComponentId,
    updatedData
}: {
    userId: string;
    equipmentId: string;
    userComponentId: string;
    updatedData: Partial<Pick<UserComponent, 
        'chainring1' | 'chainring1_brand' | 'chainring1_model' |
        'chainring2' | 'chainring2_brand' | 'chainring2_model' |
        'chainring3' | 'chainring3_brand' | 'chainring3_model'
    >>;
}) {
    if (!userId || !equipmentId || !userComponentId) {
        throw new Error("Missing required parameters for component update.");
    }

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
        
        const currentComponents: UserComponent[] = equipmentData.components || [];
        const componentIndex = currentComponents.findIndex(c => c.id === userComponentId);

        if (componentIndex === -1) {
            throw new Error("Component to update not found in user's equipment.");
        }

        const componentToUpdate = { ...currentComponents[componentIndex] };
        
        // Apply updates to the component object.
        // Use deleteField() for values that are null or empty strings.
        for (const key in updatedData) {
            const typedKey = key as keyof typeof updatedData;
            const value = updatedData[typedKey];
            if (value === null || value === '') {
                 // Use deleteField only if the key exists
                if (typedKey in componentToUpdate) {
                    delete (componentToUpdate as any)[typedKey];
                }
            } else {
                (componentToUpdate as any)[typedKey] = value;
            }
        }
        
        // Replace the old component with the updated one in the array.
        currentComponents[componentIndex] = componentToUpdate;
        
        // Atomically update the entire components array in the equipment map.
        await updateDoc(userDocRef, {
            [`equipment.${equipmentId}.components`]: currentComponents,
        });

        return { success: true };

    } catch (error) {
        console.error("Error in updateUserComponentAction:", error);
        // Re-throw the error to be caught by the calling function
        throw error;
    }
}
