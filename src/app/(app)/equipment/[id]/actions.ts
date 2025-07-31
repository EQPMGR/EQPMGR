
'use server';

import { doc, getDoc, writeBatch, updateDoc, collection, addDoc, query, where, getDocs, deleteDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserComponent, MasterComponent, Equipment } from '@/lib/types';
import { toDate } from '@/lib/date-utils';

// Helper to create a slug from a component's details
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
    masterComponentId,
    newComponentData,
    replacementReason,
}: {
    userId: string;
    equipmentId: string;
    userComponentIdToReplace: string;
    masterComponentId: string | null; // ID of existing master component
    newComponentData: Omit<MasterComponent, 'id'> | null; // Data for a new master component
    replacementReason: 'failure' | 'modification' | 'upgrade';
}) {
    if (!userId || !equipmentId || !userComponentIdToReplace || !replacementReason) {
        throw new Error("Missing required parameters for component replacement.");
    }
    
    if (!masterComponentId && !newComponentData) {
        throw new Error("Must provide either an existing component ID or data for a new one.");
    }

    const batch = writeBatch(db);
    const equipmentDocRef = doc(db, 'users', userId, 'equipment', equipmentId);

    // 1. If newComponentData is provided, create a new master component
    let finalMasterComponentId = masterComponentId;
    if (newComponentData) {
        const generatedId = createComponentId(newComponentData);
        if (!generatedId) {
            throw new Error("Could not generate a valid ID for the new component.");
        }
        finalMasterComponentId = generatedId;
        const newMasterComponentRef = doc(db, 'masterComponents', finalMasterComponentId);
        batch.set(newMasterComponentRef, newComponentData, { merge: true });
    }
    
    if (!finalMasterComponentId) {
        throw new Error("Could not determine master component ID.");
    }

    // 2. Get the current equipment data to perform the swap
    const equipmentSnap = await getDoc(equipmentDocRef);
    if (!equipmentSnap.exists()) {
        throw new Error("Equipment document not found.");
    }
    const equipment = equipmentSnap.data() as Equipment;
    const components = equipment.components || [];
    const archivedComponents = equipment.archivedComponents || [];

    const componentIndexToReplace = components.findIndex(c => c.userComponentId === userComponentIdToReplace);
    if (componentIndexToReplace === -1) {
        throw new Error("Component to replace not found in the equipment's component list.");
    }

    // 3. Archive the old component with added metadata
    const oldComponent = components[componentIndexToReplace];
    const archivedComponent = {
        ...oldComponent,
        replacedOn: new Date(),
        finalMileage: equipment.totalDistance,
        replacementReason: replacementReason
    };
    archivedComponents.push(archivedComponent);

    // 4. Create the new component to take its place
    const newComponent: Component = {
        ...(await getDoc(doc(db, 'masterComponents', finalMasterComponentId))).data() as MasterComponent,
        userComponentId: userComponentIdToReplace, // Reuse the same userComponentId to maintain its position/identity in the UI logic if needed
        masterComponentId: finalMasterComponentId,
        wearPercentage: 0,
        purchaseDate: new Date(),
        lastServiceDate: null,
    };
    
    // 5. Update the main components array
    components[componentIndexToReplace] = newComponent;

    // 6. Update the equipment document in the batch
    batch.update(equipmentDocRef, {
        components: components,
        archivedComponents: archivedComponents,
    });
    
    await batch.commit();

    return { success: true, newMasterComponentId: finalMasterComponentId };
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
    throw new Error('Missing required parameters to update sub-components.');
  }

  const batch = writeBatch(db);
  const componentsCollectionRef = collection(db, 'users', userId, 'equipment', equipmentId, 'components');

  // 1. Find and delete all existing sub-components for this parent
  const q = query(componentsCollectionRef, where('parentUserComponentId', '==', parentUserComponentId));
  const existingSubDocs = await getDocs(q);
  existingSubDocs.forEach(doc => {
    batch.delete(doc.ref);
  });

  // 2. Create new master and user components for the new data
  for (const subCompData of subComponentsData) {
    if (!subCompData.name) continue;

    // 2a. Create master component
    const masterCompId = createComponentId(subCompData as Omit<MasterComponent, 'id'>);
    if (masterCompId) {
      const masterCompRef = doc(db, 'masterComponents', masterCompId);
      batch.set(masterCompRef, {
        name: subCompData.name,
        brand: subCompData.brand,
        model: subCompData.model,
        system: 'Drivetrain', // All sub-components are currently chainrings
      }, { merge: true });

      // 2b. Create new user component document in the subcollection
      const newUserCompRef = doc(componentsCollectionRef);
      const newUserComp: UserComponent = {
        id: newUserCompRef.id,
        masterComponentId: masterCompId,
        parentUserComponentId: parentUserComponentId,
        wearPercentage: 0,
        purchaseDate: new Date(),
        lastServiceDate: null,
      };
      batch.set(newUserCompRef, newUserComp);
    }
  }

  // 3. Commit all changes
  await batch.commit();

  return { success: true };
}
