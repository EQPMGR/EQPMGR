
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
