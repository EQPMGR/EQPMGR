
'use server';

import { doc, getDoc, writeBatch, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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
    
    const equipmentDocRef = doc(db, 'users', userId, 'equipment', equipmentId);

    // 1. Create or get the new master component
    const newMasterComponentId = createComponentId(newComponentData);
    if (!newMasterComponentId) {
        throw new Error("Could not generate a valid ID for the new component.");
    }
    const newMasterComponentRef = doc(db, 'masterComponents', newMasterComponentId);

    const batch = writeBatch(db);
    batch.set(newMasterComponentRef, newComponentData, { merge: true });
    
    // 2. Update the user's equipment data
    const equipmentDocSnap = await getDoc(equipmentDocRef);
    if (!equipmentDocSnap.exists()) {
        throw new Error("Equipment document not found.");
    }

    const equipmentData = equipmentDocSnap.data();
    const currentComponents: UserComponent[] = equipmentData.components || [];
    const componentIndex = currentComponents.findIndex(c => c.id === userComponentIdToReplace);

    if (componentIndex === -1) {
        throw new Error("Component to replace not found in user's equipment.");
    }
    
    const originalComponent = currentComponents[componentIndex];

    // Create a new component object with the updated details
    const updatedComponent = {
        ...originalComponent,
        masterComponentId: newMasterComponentId,
        wearPercentage: 0,
        purchaseDate: new Date(),
        lastServiceDate: null,
        notes: `Replaced on ${new Date().toLocaleDateString()}`,
    };

    // Replace the old component with the new one in the array
    currentComponents[componentIndex] = updatedComponent;

    // Update the entire components array
    batch.update(equipmentDocRef, { components: currentComponents });

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

  const equipmentDocRef = doc(db, 'users', userId, 'equipment', equipmentId);

  // --- Step 1: Create master components ---
  const masterComponentBatch = writeBatch(db);
  const newSubUserComponents: UserComponent[] = [];

  for (const subCompData of subComponentsData) {
    if (!subCompData.name || !subCompData.name.trim()) continue;

    const masterCompData: Omit<MasterComponent, 'id'> = {
      name: subCompData.name.trim(),
      brand: subCompData.brand?.trim(),
      model: subCompData.model?.trim(),
      system: 'Drivetrain',
    };
    
    const masterComponentId = createComponentId(masterCompData);
    if (!masterComponentId) continue;

    const masterComponentRef = doc(db, 'masterComponents', masterComponentId);
    masterComponentBatch.set(masterComponentRef, masterCompData, { merge: true });

    newSubUserComponents.push({
      id: crypto.randomUUID(),
      masterComponentId,
      parentUserComponentId,
      wearPercentage: 0,
      purchaseDate: new Date(),
      lastServiceDate: null,
      notes: `Added on ${new Date().toLocaleDateString()}`,
    });
  }
  await masterComponentBatch.commit();
  
  // --- Step 2: Manually rebuild the components array ---
  const equipmentDocSnap = await getDoc(equipmentDocRef);
  if (!equipmentDocSnap.exists()) {
    throw new Error('Equipment document not found.');
  }
  const equipmentData = equipmentDocSnap.data();
  const existingComponents: UserComponent[] = equipmentData.components || [];

  // Keep all components that are NOT sub-components of the one we're editing
  const finalComponents = existingComponents.filter(
    (c) => c.parentUserComponentId !== parentUserComponentId
  );

  // Add the newly created sub-components to the list
  finalComponents.push(...newSubUserComponents);

  // --- Step 3: Perform a single, clean update of the entire components array ---
  await updateDoc(equipmentDocRef, {
      components: finalComponents,
  });


  return { success: true };
}
