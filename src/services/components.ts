

'use server';

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MasterComponent } from '@/lib/types';


export interface MasterComponentWithOptions extends MasterComponent {
    // We might add more options here later
}

/**
 * Fetches all documents from the masterComponents collection.
 * This function is intended to be called from the client-side context,
 * respecting Firestore security rules.
 */
export async function fetchAllMasterComponents(): Promise<MasterComponentWithOptions[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'masterComponents'));
    const components: MasterComponentWithOptions[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
       // Data validation step
      if (data && typeof data.name === 'string' && typeof data.system === 'string') {
           components.push({ id: doc.id, ...data } as MasterComponentWithOptions);
      } else {
          console.warn(`[Data Validation] Skipped malformed component document with ID: ${doc.id}. Document data:`, data);
      }
    });
    return components;
  } catch (error) {
    console.error("Error fetching master components:", error);
    // Throw a more specific error to help with debugging Firestore permissions.
    if ((error as any).code === 'permission-denied') {
        throw new Error("Firestore permission denied. Ensure your security rules allow reads to the 'masterComponents' collection for authenticated users.");
    }
    throw new Error("Failed to fetch master components from the database.");
  }
}

/**
 * DEPRECATED: This function uses a 'where' clause that can fail if a Firestore index
 * is not properly configured. It is replaced by fetchAllMasterComponents, which
 * fetches all data and allows for client-side filtering.
 * @param type The component name/type to filter by.
 * @returns A promise that resolves to an array of matching master components.
 */
export async function fetchMasterComponentsByType(type: string): Promise<MasterComponentWithOptions[]> {
    if (!type) {
        return [];
    }
    try {
        const componentsCollection = collection(db, 'masterComponents');
        const q = query(componentsCollection, where("name", "==", type));
        const querySnapshot = await getDocs(q);

        const components: MasterComponentWithOptions[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Data validation step
            if (data && typeof data.name === 'string' && typeof data.system === 'string') {
                 components.push({ id: doc.id, ...data } as MasterComponentWithOptions);
            } else {
                console.warn(`[Data Validation] Skipped malformed component document with ID: ${doc.id}. Document data:`, data);
            }
        });
        return components;

    } catch (error) {
        console.error(`Error fetching components of type ${type}:`, error);
        // Re-throw the original error to be displayed on the client.
        if ((error as any).code?.includes('failed-precondition')) {
            throw new Error(`A database index is required for this query. Please check the Firestore console for an automatic index creation link. The query is on the 'masterComponents' collection, for the 'name' field.`);
        }
        throw error;
    }
}
