
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { MasterComponent } from '@/lib/types';

export interface DuplicateGroup {
  key: string;
  components: MasterComponent[];
}

/**
 * Finds potential duplicate components in the masterComponents collection.
 * Duplicates are determined by having the same name, brand, and series.
 * @returns A promise that resolves to an array of groups of duplicate components.
 */
export async function findDuplicateMasterComponents(): Promise<DuplicateGroup[]> {
  try {
    const componentsSnapshot = await adminDb.collection('masterComponents').get();
    const ignoredSnapshot = await adminDb.collection('ignoredDuplicates').get();
    const ignoredKeys = new Set(ignoredSnapshot.docs.map(doc => doc.id));
    
    const components: MasterComponent[] = [];
    componentsSnapshot.forEach((doc) => {
      components.push({ id: doc.id, ...doc.data() } as MasterComponent);
    });

    // Group components by a composite key of name, brand, and series
    const groups: { [key: string]: MasterComponent[] } = {};
    for (const component of components) {
      // Don't consider components without a brand and series as potential duplicates
      if (!component.brand || !component.series) {
        continue;
      }
      
      const key = `${component.name}|${component.brand}|${component.series}`;
      
      // Skip groups that have been marked as ignored
      if (ignoredKeys.has(key)) {
        continue;
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(component);
    }

    // Filter out groups that don't have duplicates
    const duplicateGroups: DuplicateGroup[] = Object.entries(groups)
      .filter(([key, componentList]) => componentList.length > 1)
      .map(([key, componentList]) => ({ key, components: componentList }));
      
    return duplicateGroups;

  } catch (error) {
    console.error("Error finding duplicate components:", error);
    throw new Error("Failed to scan for duplicate components.");
  }
}
