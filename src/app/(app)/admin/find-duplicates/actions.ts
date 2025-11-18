
'use server';

import { getServerDb } from '@/backend';

/**
 * Merges multiple master components into a single primary component.
 * This function will:
 * 1. Find all user equipment documents.
 * 2. For each user, check if their equipment uses any of the component IDs to be merged.
 * 3. If so, update the component references to point to the primary component ID.
 * 4. After updating all references, delete the old (non-primary) master components.
 * @param primaryComponentId The ID of the component to keep.
 * @param idsToMerge The list of component IDs to merge into the primary one.
 */
export async function mergeDuplicateComponents(primaryComponentId: string, idsToMerge: string[]): Promise<{ success: boolean; message: string }> {
  if (!primaryComponentId || !idsToMerge || idsToMerge.length === 0) {
    return { success: false, message: 'Missing primary component ID or IDs to merge.' };
  }

  const db = await getServerDb();
  const batch = db.batch();

  try {
    // 1. Find all users who might have the components to be merged.
    const usersSnapshot = await db.getDocs('app_users');

    // 2. Iterate through each user and their equipment.
    for (const userDoc of usersSnapshot.docs) {
      const equipmentSnapshot = await db.getDocsFromSubcollection(`app_users/${userDoc.id}`, 'equipment');

      for (const equipmentDoc of equipmentSnapshot.docs) {
        let needsUpdate = false;
        const components = equipmentDoc.data.components || [];

        const updatedComponents = components.map((component: any) => {
          if (idsToMerge.includes(component.masterComponentId)) {
            needsUpdate = true;
            return { ...component, masterComponentId: primaryComponentId };
          }
          return component;
        });

        if (needsUpdate) {
          batch.updateInSubcollection(`users/${userDoc.id}`, 'equipment', equipmentDoc.id, { components: updatedComponents });
        }
      }
    }

    // 3. Delete the old master components.
    for (const id of idsToMerge) {
        if (id !== primaryComponentId) {
            batch.delete('masterComponents', id);
        }
    }

    // 4. Commit all the changes.
    await batch.commit();

    return { success: true, message: `Successfully merged ${idsToMerge.length - 1} components into ${primaryComponentId}.` };
  } catch (error: any) {
    console.error('Error merging duplicates:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during merge.' };
  }
}

/**
 * Marks a group of components as not being duplicates.
 * This stores a record in a new `ignoredDuplicates` collection.
 * @param key The unique key representing the duplicate group.
 */
export async function ignoreDuplicateGroup(key: string): Promise<{ success: boolean; message: string }> {
    if (!key) {
        return { success: false, message: 'A group key is required to ignore duplicates.' };
    }

    try {
        const db = await getServerDb();
        await db.setDoc('ignoredDuplicates', key, { ignored: true, ignoredAt: new Date() });
        return { success: true, message: `Group "${key}" will be ignored in future scans.` };

    } catch (error: any) {
        console.error('Error ignoring group:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}
