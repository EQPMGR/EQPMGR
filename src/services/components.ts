
'use server';

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MasterComponent } from '@/lib/types';

export interface MasterComponentWithOptions extends MasterComponent {
    // We might add more options here later
}

/**
 * Fetches all documents from the masterComponents collection.
 * This is a server-side function.
 * @returns A promise that resolves to an array of master components.
 */
export async function fetchAllMasterComponents(): Promise<MasterComponentWithOptions[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'masterComponents'));
    const components: MasterComponentWithOptions[] = [];
    querySnapshot.forEach((doc) => {
      components.push({ id: doc.id, ...doc.data() } as MasterComponentWithOptions);
    });
    return components;
  } catch (error) {
    console.error("Error fetching master components:", error);
    throw error;
  }
}

/**
 * Fetches master components of a specific type (e.g., "Cassette").
 * @param type The component name/type to filter by.
 * @returns A promise that resolves to an array of matching master components.
 */
export async function fetchMasterComponentsByType(type: string): Promise<MasterComponentWithOptions[]> {
    try {
        const q = query(collection(db, 'masterComponents'), where('name', '==', type));
        const querySnapshot = await getDocs(q);
        const components: MasterComponentWithOptions[] = [];
        querySnapshot.forEach((doc) => {
            components.push({ id: doc.id, ...doc.data() } as MasterComponentWithOptions);
        });
        return components;
    } catch (error) {
        console.error(`Error fetching components of type ${type}:`, error);
        throw error;
    }
}
