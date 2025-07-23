
'use server';
/**
 * @fileOverview Service functions for interacting with the Pinecone vector database.
 */

import { ai } from '@/ai/genkit';
import { pineconeIndex } from '@/lib/pinecone';
import { textEmbedding004 } from '@genkit-ai/googleai';
import type { MasterComponent } from '@/lib/types';
import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';

// Define the shape of the metadata we expect to get back from Pinecone
interface ComponentMetadata {
  name: string;
  brand: string;
  series: string;
  model: string;
  system: string;
}

type PineconeRecord = ScoredPineconeRecord<ComponentMetadata>;


/**
 * Finds components in the vector database that are semantically similar to the input text.
 * @param text The text to find similar components for (e.g., a component description).
 * @param topK The number of similar components to return.
 * @returns A promise that resolves to an array of similar components.
 */
export async function findSimilarComponents(text: string, topK: number = 5): Promise<PineconeRecord[]> {
  try {
    // 1. Generate an embedding for the input text.
    const embedding = await ai.embed({
      embedder: textEmbedding004,
      content: text,
    });

    // 2. Query the Pinecone index with the generated embedding.
    const queryResponse = await pineconeIndex.query({
      vector: embedding,
      topK,
      includeMetadata: true,
    });

    return (queryResponse?.matches as PineconeRecord[]) || [];
  } catch (error) {
    console.error("Error finding similar components:", error);
    // In case of an error, return an empty array to prevent the calling flow from failing.
    // The error is logged for debugging.
    return [];
  }
}
