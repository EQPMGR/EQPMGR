
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { MasterComponent } from '@/lib/types';


export interface MasterComponentWithOptions extends MasterComponent {
    // We might add more options here later
}

/**
 * Fetches all documents from the masterComponents collection using the Admin SDK.
 * This is a server-side function.
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
    console.error("Error fetching master components with Admin SDK:", error);
    throw new Error("Failed to fetch master components from the database.");
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
        const componentsCollection = adminDb.collection('masterComponents');
        const q = componentsCollection.where('name', '==', type);
        const querySnapshot = await q.get();
        
        const components: MasterComponentWithOptions[] = [];
        querySnapshot.forEach((doc) => {
            components.push({ id: doc.id, ...doc.data() } as MasterComponentWithOptions);
        });
        return components;
    } catch (error) {
        console.error(`Error fetching components of type ${type} with Admin SDK:`, error);
        // Re-throw a more user-friendly error.
        throw new Error(`Could not load components. This may be due to a missing Firestore index. Please check your Firebase console.`);
    }
}
