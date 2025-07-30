
'use server';
/**
 * @fileOverview A flow for indexing component data into Firestore.
 * This file now contains two flows:
 * - `indexAllComponentsFlow`: A server-side batch processor (currently unused but kept for reference).
 * - `indexComponentFlow`: A new flow to process a single component, called from the client.
 */
import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { textEmbedding004 } from '@genkit-ai/googleai';
import type { MasterComponent } from '@/lib/types';


/**
 * Creates a descriptive string from a component object.
 * This string will be used to generate the vector embedding.
 * @param component The component data.
 * @returns A descriptive string.
 */
const createComponentVectorDocument = (component: MasterComponent): string => {
  const fields = [
    `Name: ${component.name}`,
    `Brand: ${component.brand || 'Unknown'}`,
    `System: ${component.system}`,
  ];
  if (component.series) fields.push(`Series: ${component.series}`);
  if (component.model) fields.push(`Model: ${component.model}`);
  
  return fields.join(', ');
};

const isValidEmbedding = (embedding: any): embedding is number[] => {
    return Array.isArray(embedding) && embedding.length > 0 && typeof embedding[0] === 'number';
}

/**
 * DEPRECATED: A Genkit flow that takes all master components, generates vector embeddings for those
 * that need it, and saves them back to Firestore. This has proven to be unstable for large datasets.
 * It is replaced by the client-side orchestration calling `indexComponentFlow`.
 */
export const indexAllComponentsFlow = ai.defineFlow(
  {
    name: 'indexAllComponentsFlow',
    inputSchema: z.void(),
    outputSchema: z.object({
        message: z.string(),
        indexedCount: z.number(),
    }),
  },
  async () => {
    // This flow is deprecated and should not be used.
    // The logic has been moved to the client for better stability.
    throw new Error("This server-side batch indexing flow is deprecated. Please use the client-side implementation.");
  }
);

// Define a strict schema for the component data passed to the flow.
const IndexComponentInputSchema = z.object({
    id: z.string(),
    name: z.string(),
    brand: z.string().optional(),
    series: z.string().optional(),
    model: z.string().optional(),
    system: z.string(),
    // Allow other fields to exist but we don't need them for the embedding.
}).passthrough();

/**
 * A Genkit flow that takes a single component data, generates a vector embedding,
 * and saves the full component document (with embedding) to Firestore.
 * This flow is designed to be called individually for each component from the client.
 */
export const indexComponentFlow = ai.defineFlow(
  {
    name: 'indexComponentFlow',
    inputSchema: IndexComponentInputSchema,
    outputSchema: z.void(),
  },
  async (component) => {
    try {
        // 1. Create the string to be embedded.
        const vectorDocument = createComponentVectorDocument(component as MasterComponent);

        // 2. Generate the embedding.
        const embedding = await ai.embed({
            embedder: textEmbedding004,
            content: vectorDocument,
        });
        
        // 3. Prepare the full document to save to Firestore.
        const docToSave = {
            embedding: embedding,
        };
        
        // 4. Save/update the document in Firestore.
        const componentDocRef = doc(db, 'masterComponents', component.id);
        await updateDoc(componentDocRef, docToSave);

    } catch (e: any) {
        if (e.message?.includes('permission-denied') || e.code === 7 || e.code === 'PERMISSION_DENIED') {
            throw new Error(`PERMISSION_DENIED while processing ${component.id}. The AI service rejected the request. Ensure the Vertex AI API is enabled and your API key has the correct permissions.`);
        }
        throw new Error(`Failed to process component ${component.id}: ${e.message}`);
    }
  }
);
