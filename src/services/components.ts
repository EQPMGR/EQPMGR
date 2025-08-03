
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { MasterComponent } from '@/lib/types';


export interface MasterComponentWithOptions extends MasterComponent {
    // We might add more options here later
}

/**
 * Fetches all documents from the masterComponents collection.
 * This is a server-side function using the Admin SDK.
 */
export async function fetchAllMasterComponents(): Promise<MasterComponentWithOptions[]> {
  try {
    const querySnapshot = await adminDb.collection('masterComponents').get();
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
 * Fetches master components of a specific type (e.g., "Cassette") using the Admin SDK.
 * @param type The component name/type to filter by.
 * @returns A promise that resolves to an array of matching master components.
 */
export async function fetchMasterComponentsByType(type: string): Promise<MasterComponentWithOptions[]> {
    if (!type) {
        return [];
    }
    try {
        // Correctly query the collection using the Admin SDK.
        const querySnapshot = await adminDb.collection('masterComponents').where('name', '==', type).get();

        const components: MasterComponentWithOptions[] = [];
        querySnapshot.forEach((doc) => {
            components.push({ id: doc.id, ...doc.data() } as MasterComponentWithOptions);
        });
        return components;
    } catch (error) {
        console.error(`Error fetching components of type ${type}:`, error);
        // Re-throw the error to be caught by the client and displayed in a toast.
        throw new Error(`Failed to fetch components of type ${type}. Please check server logs.`);
    }
}
