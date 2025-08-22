

'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import type { MasterComponent } from '@/lib/types';


export interface MasterComponentWithOptions extends MasterComponent {
    // We might add more options here later
}

/**
 * Fetches all documents from the masterComponents collection using the Admin SDK.
 * This is a server action callable from client components.
 */
export async function fetchAllMasterComponents(): Promise<MasterComponentWithOptions[]> {
  try {
    const adminDb = await getAdminDb();
    // Use the adminDb instance which has full privileges on the server.
    const querySnapshot = await adminDb.collection('masterComponents').get();
    const components: MasterComponentWithOptions[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
       // Data validation step to ensure documents have the basic required fields.
      if (data && typeof data.name === 'string' && typeof data.system === 'string') {
           components.push({ id: doc.id, ...data } as MasterComponentWithOptions);
      } else {
          console.warn(`[Data Validation] Skipped malformed component document with ID: ${doc.id}. Document data:`, data);
      }
    });
    return components;
  } catch (error) {
    console.error("Error fetching master components with Admin SDK:", error);
    // Throw a more specific error to help with debugging.
    if ((error as any).code === 'permission-denied' || (error as any).code === 7) {
        throw new Error('Firestore permission denied on the server. This is unexpected as the Admin SDK should bypass security rules. Check service account permissions in Google Cloud IAM.');
    }
    throw new Error("Failed to fetch master components from the database on the server.");
  }
}

/**
 * DEPRECATED: This function is no longer used. `fetchAllMasterComponents` is used instead.
 * @param type The component name/type to filter by.
 * @returns A promise that resolves to an array of matching master components.
 */
export async function fetchMasterComponentsByType(type: string): Promise<MasterComponentWithOptions[]> {
    console.warn("DEPRECATED: fetchMasterComponentsByType is called. Use fetchAllMasterComponents instead.");
    return fetchAllMasterComponents();
}
