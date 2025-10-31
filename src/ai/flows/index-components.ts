
'use server';
/**
 * @fileOverview A flow for indexing component data into Firestore.
 * This file now contains two flows:
 * - `indexAllComponentsFlow`: A server-side batch processor (currently unused but kept for reference).
 * - `indexComponentFlow`: A new flow to process a single component, called from the client.
 */
import { ai } from '@/ai/genkit';
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

// Define the output schema to return the embedding.
const IndexComponentOutputSchema = z.object({
    embedding: z.array(z.number()),
});


/**
 * A Genkit flow that takes a single component data, generates a vector embedding,
 * and crucially, **returns it to the client**. The client is now responsible for
 * writing this data to Firestore. This avoids server-side permission issues.
 */
export const indexComponentFlow = ai.defineFlow(
  {
    name: 'indexComponentFlow',
    inputSchema: IndexComponentInputSchema,
    outputSchema: IndexComponentOutputSchema,
  },
  async (component) => {
    console.log(`[SERVER] Starting indexComponentFlow for component ID: ${component.id}`);
    try {
        // 1. Create the string to be embedded.
        const vectorDocument = createComponentVectorDocument(component as MasterComponent);
        console.log(`[SERVER] Created vector document: "${vectorDocument}"`);

        // 2. Generate the embedding.
        console.log(`[SERVER] Calling ai.embed with text embedder...`);
        const embedding = await ai.embed({
            embedder: textEmbedding004,
            content: vectorDocument,
        });
        console.log(`[SERVER] Successfully received embedding from AI service.`);
        
        // 3. Return the embedding to the client.
        return { embedding };

    } catch (e: any) {
        console.error(`[SERVER ERROR] in indexComponentFlow for ${component.id}:`, e);
        // Re-throw a more informative error to the client.
        if (e.code === 7 || e.code === 'PERMISSION_DENIED') {
            const detailedError = `The AI service call failed with a permission error. This can be caused by the server-side API key having HTTP referrer restrictions, or the service account lacking the 'Vertex AI User' IAM role.`;
            throw new Error(detailedError);
        }
        throw new Error(`Failed to generate embedding for component ${component.id}: ${e.message}`);
    }
  }
);
