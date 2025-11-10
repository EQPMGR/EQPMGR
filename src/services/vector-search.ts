
'use server';
/**
 * @fileOverview Service functions for interacting with vector search (backend-agnostic).
 */

import { ai } from '@/ai/genkit';
import { textEmbedding004 } from '@genkit-ai/googleai';
import { getServerDb } from '@/backend';
import type { MasterComponent } from '@/lib/types';


/**
 * Finds components that are semantically similar to the input text.
 * @param text The text to find similar components for (e.g., a component description).
 * @param topK The number of similar components to return.
 * @returns A promise that resolves to an array of similar components.
 */
export async function findSimilarComponents(text: string, topK: number = 5): Promise<MasterComponent[]> {
  try {
    // 1. Generate an embedding for the input text.
    const embedding = await ai.embed({
      embedder: textEmbedding004,
      content: text,
    });

    // 2. Query backend for the nearest neighbors.
    const db = await getServerDb();

    // The query finds the nearest neighbors to the provided embedding vector.
    const querySnapshot = await db.findNearest<MasterComponent>(
        'masterComponents',
        'embedding',
        embedding,
        {
            limit: topK,
            distanceMeasure: 'COSINE'
        }
    );

    const results: MasterComponent[] = querySnapshot.map(doc => {
      // Note: The 'embedding' field itself is large and not needed on the client.
      const { embedding, ...rest } = doc.data;
      return { id: doc.id, ...rest } as MasterComponent;
    });

    return results;
  } catch (error) {
    console.error("Error finding similar components:", error);
    // In case of an error (e.g., index not configured), return an empty array.
    // The error is logged for debugging.
    return [];
  }
}
