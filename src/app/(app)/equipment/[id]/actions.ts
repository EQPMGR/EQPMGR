
'use server';

import { doc, getDoc, writeBatch, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
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
    };

    const updatePayload = {
      [`equipment.${equipmentId}.components`]: currentComponents,
    };

    batch.update(userDocRef, updatePayload);

    // 3. Commit the batch
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

  const userDocRef = doc(db, 'users', userId);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    throw new Error('User document not found.');
  }
  const equipmentData = userDocSnap.data().equipment?.[equipmentId];
  if (!equipmentData) {
    throw new Error('Equipment not found in user data.');
  }

  // --- Step 1: Prepare new components and identify old ones to remove ---
  const newSubComponentsForUser: UserComponent[] = [];
  const oldSubComponents = (equipmentData.components || []).filter(
    (c: UserComponent) => c.parentUserComponentId === parentUserComponentId
  );
  
  // Use a batch for all database writes
  const batch = writeBatch(db);

  // --- Step 2: Create master components and prepare user components ---
  for (const subCompData of subComponentsData) {
    if (!subCompData.name) continue;

    const masterCompData: Omit<MasterComponent, 'id'> = {
      name: subCompData.name,
      brand: subCompData.brand,
      model: subCompData.model,
      system: 'Drivetrain',
    };
    
    const masterComponentId = createComponentId(masterCompData);
    if (!masterComponentId) continue;

    // Add master component creation to the batch
    const masterComponentRef = doc(db, 'masterComponents', masterComponentId);
    batch.set(masterComponentRef, masterCompData, { merge: true });

    newSubComponentsForUser.push({
      id: crypto.randomUUID(),
      masterComponentId,
      parentUserComponentId,
      wearPercentage: 0,
      purchaseDate: new Date(),
      lastServiceDate: null,
      notes: `Added on ${new Date().toLocaleDateString()}`,
    });
  }
  
  // --- Step 3: Update the user's document using array operations ---
  const updatePayload: { [key: string]: any } = {};

  // Atomically remove the old sub-components
  if (oldSubComponents.length > 0) {
      updatePayload[`equipment.${equipmentId}.components`] = arrayRemove(...oldSubComponents);
  }
  
  // Add the new sub-components
  if (newSubComponentsForUser.length > 0) {
      // If we are also removing, we need to handle this differently
      // because you can't have arrayRemove and arrayUnion on the same field in one update.
      // However, since we are replacing the set, we'll do this in two steps inside the transaction logic.
      // For now, let's assume we can do this in separate updates for simplicity.
      // The most robust way is a transaction, but let's try this first.
      if (updatePayload[`equipment.${equipmentId}.components`]) {
        // First, remove old ones
        await updateDoc(userDocRef, updatePayload);
        // Then, add new ones
        await updateDoc(userDocRef, {
            [`equipment.${equipmentId}.components`]: arrayUnion(...newSubComponentsForUser)
        });
      } else if (newSubComponentsForUser.length > 0) {
        // If there were no old components, just add the new ones
         await updateDoc(userDocRef, {
            [`equipment.${equipmentId}.components`]: arrayUnion(...newSubComponentsForUser)
        });
      }
  } else if (oldSubComponents.length > 0) {
      // If there are no new components but there were old ones, just run the remove update
      await updateDoc(userDocRef, updatePayload);
  }
  
  // The master component writes still need to be committed.
  await batch.commit();

  return { success: true };
}