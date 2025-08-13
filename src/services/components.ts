
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
      components.push({ id: doc.id, ...doc.data() } as MasterComponentWithOptions);
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
 * Fetches master components of a specific type (e.g., "Cassette").
 * This function now fetches all components and filters them on the server
 * to avoid complex queries that might conflict with vector indexes.
 * @param type The component name/type to filter by.
 * @returns A promise that resolves to an array of matching master components.
 */
export async function fetchMasterComponentsByType(type: string): Promise<MasterComponentWithOptions[]> {
    if (!type) {
        return [];
    }
    try {
        // Fetch all components and filter on the server. This is more robust against
        // Firestore indexing issues, especially with vector indexes in place.
        const allComponents = await fetchAllMasterComponents();
        const filteredComponents = allComponents.filter(c => c.name === type);
        return filteredComponents;

    } catch (error) {
        console.error(`Error fetching components of type ${type}:`, error);
        // Re-throw the original error to be displayed on the client.
        if ((error as any).code?.includes('failed-precondition')) {
            throw new Error(`A database index is required for this query. Please check the Firestore console for an automatic index creation link related to the 'masterComponents' collection on the 'name' field.`);
        }
        throw error;
    }
}
