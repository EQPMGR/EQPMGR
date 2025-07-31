
'use server';

import { doc, getDoc, writeBatch, updateDoc, collection, addDoc, query, where, getDocs, deleteDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserComponent, MasterComponent, Equipment, ArchivedComponent } from '@/lib/types';
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
    const componentsCollectionRef = collection(db, 'users', userId, 'equipment', equipmentId, 'components');
    const componentToReplaceRef = doc(componentsCollectionRef, userComponentIdToReplace);

    try {
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

        // 2. Get the component to be replaced and the equipment data
        const [equipmentSnap, componentToReplaceSnap, newMasterComponentSnap] = await Promise.all([
            getDoc(equipmentDocRef),
            getDoc(componentToReplaceRef),
            getDoc(doc(db, 'masterComponents', finalMasterComponentId))
        ]);
        
        if (!equipmentSnap.exists()) throw new Error("Equipment document not found.");
        if (!componentToReplaceSnap.exists()) throw new Error("Component to replace not found.");
        if (!newMasterComponentSnap.exists()) throw new Error("New master component not found.");

        const equipment = equipmentSnap.data() as Equipment;
        const userComponentToReplace = componentToReplaceSnap.data() as UserComponent;
        const masterComponentToReplaceSnap = await getDoc(doc(db, 'masterComponents', userComponentToReplace.masterComponentId));
        if (!masterComponentToReplaceSnap.exists()) throw new Error("Old master component not found.");


        // 3. Archive the old component with added metadata
        const archivedComponent: ArchivedComponent = {
            ...masterComponentToReplaceSnap.data() as MasterComponent,
            ...userComponentToReplace,
            userComponentId: userComponentToReplace.id,
            replacedOn: new Date(),
            finalMileage: equipment.totalDistance || 0,
            replacementReason: replacementReason,
            purchaseDate: toDate(userComponentToReplace.purchaseDate),
            lastServiceDate: null,
        };

        // Add to archivedComponents array on main equipment doc
        batch.update(equipmentDocRef, {
            archivedComponents: arrayUnion(archivedComponent)
        });

        // 4. Create the new component to take its place
        const newUserComponentRef = doc(componentsCollectionRef); // Create a new doc for the new component
        const newUserComponent: UserComponent = {
            id: newUserComponentRef.id,
            masterComponentId: finalMasterComponentId,
            wearPercentage: 0,
            purchaseDate: new Date(),
            lastServiceDate: null,
        };
        
        // 5. Delete the old component document and add the new one
        batch.delete(componentToReplaceRef);
        batch.set(newUserComponentRef, newUserComponent);

        // 6. Commit all changes
        await batch.commit();

        return { success: true, newMasterComponentId: finalMasterComponentId };
    
    } catch (error) {
        console.error("Error in replaceUserComponentAction: ", error);
        throw error;
    }
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
