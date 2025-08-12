
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
    // Throw a more specific error to help with debugging Firestore permissions.
    if ((error as any).code === 'permission-denied' || (error as any).code === 7) {
        throw new Error("Firestore permission denied. Ensure your service account has the 'Cloud Datastore User' role.");
    }
    throw new Error("Failed to fetch master components from the database.");
  }
}

/**
 * Fetches master components of a specific type (e.g., "Cassette") by fetching all components
 * and filtering them in memory. This is more robust than a direct query if indexes are not set up.
 * @param type The component name/type to filter by.
 * @returns A promise that resolves to an array of matching master components.
 */
export async function fetchMasterComponentsByType(type: string): Promise<MasterComponentWithOptions[]> {
    if (!type) {
        return [];
    }
    try {
        const allComponents = await fetchAllMasterComponents();
        const filteredComponents = allComponents.filter(c => c.name === type);
        return filteredComponents;
    } catch (error) {
        console.error(`Error fetching components of type ${type}:`, error);
        // Re-throw the original error to be displayed on the client.
        throw error;
    }
}
