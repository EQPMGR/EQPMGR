
'use server';

import { doc, getDoc, writeBatch, updateDoc } from 'firebase/firestore';
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

  const masterComponentBatch = writeBatch(db);
  const newSubUserComponents: UserComponent[] = [];

  // --- Step 1: Create master components and prepare new user components ---
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

    // Add master component creation to the batch
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

  // Commit all master component writes first.
  await masterComponentBatch.commit();
  
  // --- Step 2: Manually rebuild the components array for the user's equipment ---
  const existingComponents: UserComponent[] = (equipmentData.components || []).map((c: any) => ({
      ...c,
      // Ensure dates are correctly formatted for comparison if needed, though we filter by ID.
      purchaseDate: toDate(c.purchaseDate), 
      lastServiceDate: toDate(c.lastServiceDate)
  }));
  
  // Keep all components that are NOT sub-components of the one we're editing
  const finalComponents = existingComponents.filter(
    (c) => c.parentUserComponentId !== parentUserComponentId
  );

  // Add the newly created sub-components to the list
  finalComponents.push(...newSubUserComponents);

  // --- Step 3: Perform a single, clean update of the entire components array ---
  await updateDoc(userDocRef, {
      [`equipment.${equipmentId}.components`]: finalComponents,
  });


  return { success: true };
}
