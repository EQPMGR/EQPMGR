
'use server';
/**
 * @fileOverview Service functions for interacting with Firestore's native vector search.
 */

import { ai } from '@/ai/genkit';
import { textEmbedding004 } from '@genkit-ai/googleai';
import { collection, query, findNearest, getDocs, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MasterComponent } from '@/lib/types';


/**
 * Finds components in Firestore that are semantically similar to the input text.
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

    // 2. Query Firestore for the nearest neighbors.
    const componentsCollection = collection(db, 'masterComponents');
    
    // As of now, the Node.js SDK for Firestore requires a 'flat' index with no pre-filtering.
    // The query finds the nearest neighbors to the provided embedding vector.
    const vectorQuery = findNearest(
        'embedding', 
        embedding, 
        { 
            limit: topK, 
            distanceMeasure: 'COSINE' 
        }
    );

    const q = query(componentsCollection, vectorQuery);
    const querySnapshot = await getDocs(q);
    
    const results: MasterComponent[] = [];
    querySnapshot.forEach(doc => {
      // Note: The 'embedding' field itself is large and not needed on the client.
      const { embedding, ...rest } = doc.data();
      results.push({ id: doc.id, ...rest } as MasterComponent);
    });

    return results;
  } catch (error) {
    console.error("Error finding similar components in Firestore:", error);
    // In case of an error (e.g., index not configured), return an empty array.
    // The error is logged for debugging.
    return [];
  }
}
