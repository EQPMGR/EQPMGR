
'use server';

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MasterComponent } from '@/lib/types';

/**
 * Fetches all documents from the masterComponents collection.
 * @returns A promise that resolves to an array of master components.
 */
export async function fetchAllMasterComponents(): Promise<MasterComponent[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'masterComponents'));
    const components: MasterComponent[] = [];
    querySnapshot.forEach((doc) => {
      components.push({ id: doc.id, ...doc.data() } as MasterComponent);
    });
    return components;
  } catch (error) {
    console.error("Error fetching master components:", error);
    // Depending on the use case, you might want to throw the error
    // or return an empty array.
    return [];
  }
}
