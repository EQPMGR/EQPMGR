
'use server';

import { getServerDb } from '@/backend';

/**
 * Iterates through all documents in the `masterComponents` collection
 * and removes the `embedding` field if it exists.
 */
export async function removeAllEmbeddingsAction(): Promise<{ success: boolean; message: string }> {
  try {
    const db = await getServerDb();
    let totalProcessed = 0;
    let totalUpdated = 0;
    let lastDocId: string | null = null;

    while (true) {
        const constraints = [
            { type: 'orderBy' as const, field: '__name__' as const, direction: 'asc' as const },
            { type: 'limit' as const, value: 500 }
        ];

        if (lastDocId) {
            constraints.push({ type: 'startAfter' as const, value: lastDocId });
        }

        const snapshot = await db.getDocs('masterComponents', ...constraints);

        if (snapshot.docs.length === 0) {
            break; // No more documents to process
        }

        const batch = db.batch();
        let updatedInBatch = 0;

        snapshot.docs.forEach(doc => {
            if (doc.data.embedding !== undefined) {
                batch.update('masterComponents', doc.id, { embedding: db.deleteField() });
                updatedInBatch++;
            }
        });

        if (updatedInBatch > 0) {
            await batch.commit();
            totalUpdated += updatedInBatch;
        }

        totalProcessed += snapshot.docs.length;
        lastDocId = snapshot.docs[snapshot.docs.length - 1].id;

        // Small delay to be respectful to backend API limits
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
