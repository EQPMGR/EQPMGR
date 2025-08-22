
'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Iterates through all documents in the `masterComponents` collection
 * and removes the `embedding` field if it exists.
 */
export async function removeAllEmbeddingsAction(): Promise<{ success: boolean; message: string }> {
  try {
    const adminDb = await getAdminDb();
    const componentsRef = adminDb.collection('masterComponents');
    let totalProcessed = 0;
    let totalUpdated = 0;
    let lastDoc = null;

    while (true) {
        const query = componentsRef.orderBy('__name__').limit(500);
        const snapshot = await (lastDoc ? query.startAfter(lastDoc) : query).get();
        
        if (snapshot.empty) {
            break; // No more documents to process
        }

        const batch = adminDb.batch();
        let updatedInBatch = 0;
        
        snapshot.docs.forEach(doc => {
            if (doc.data().embedding !== undefined) {
                batch.update(doc.ref, { embedding: FieldValue.delete() });
                updatedInBatch++;
            }
        });

        if (updatedInBatch > 0) {
            await batch.commit();
            totalUpdated += updatedInBatch;
        }

        totalProcessed += snapshot.docs.length;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];

        // Small delay to be respectful to Firestore API limits
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    return {
      success: true,
      message: `Operation complete. Scanned ${totalProcessed} documents and removed embeddings from ${totalUpdated}.`,
    };

  } catch (error: any) {
    console.error('Error removing embeddings:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred during the cleanup process.',
    };
  }
}
