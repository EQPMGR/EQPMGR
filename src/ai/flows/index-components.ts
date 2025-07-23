
'use server';
/**
 * @fileOverview A flow for indexing component data into a vector database.
 */
import { ai } from '@/ai/genkit';
import { pineconeIndex } from '@/lib/pinecone';
import type { MasterComponent } from '@/lib/types';
import { z } from 'zod';
import { textEmbedding004 } from '@genkit-ai/googleai';

// Define the schema for the component data we want to index.
const ComponentIndexSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  series: z.string().optional(),
  model: z.string().optional(),
  system: z.string(),
});

/**
 * Creates a descriptive string from a component object.
 * This string will be used to generate the vector embedding.
 * @param component The master component object.
 * @returns A descriptive string.
 */
const createComponentVectorDocument = (component: Omit<MasterComponent, 'id'>): string => {
  const fields = [
    `Name: ${component.name}`,
    `Brand: ${component.brand}`,
    `System: ${component.system}`,
  ];
  if (component.series) fields.push(`Series: ${component.series}`);
  if (component.model) fields.push(`Model: ${component.model}`);
  
  return fields.join(', ');
};

/**
 * A Genkit flow that takes a master component, generates a vector embedding
 * from its details, and upserts it into the Pinecone index.
 */
export const indexComponentFlow = ai.defineFlow(
  {
    name: 'indexComponentFlow',
    inputSchema: ComponentIndexSchema,
    outputSchema: z.void(),
  },
  async (component) => {
    // 1. Create the string to be embedded.
    const vectorDocument = createComponentVectorDocument(component);

    // 2. Generate the embedding.
    const embedding = await ai.embed({
        embedder: textEmbedding004,
        content: vectorDocument,
    });

    // 3. Upsert the vector into the Pinecone index.
    await pineconeIndex.upsert([
      {
        id: component.id,
        values: embedding,
        metadata: {
          name: component.name,
          brand: component.brand,
          series: component.series || '',
          model: component.model || '',
          system: component.system,