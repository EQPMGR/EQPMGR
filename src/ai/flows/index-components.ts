
'use server';
/**
 * @fileOverview A flow for indexing component data into Firestore.
 * This flow now handles both creating the embedding and saving the component data.
 */
import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { z } from 'zod';
import { textEmbedding004 } from '@genkit-ai/googleai';

// Define the schema for the component data we want to index.
const ComponentIndexSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  series: z.string().optional(),
  model: z.string().optional(),
  system: z.string(),
  size: z.string().optional(),
  sizeVariants: z.string().optional(),
  chainring1: z.string().optional(),
  chainring2: z.string().optional(),
  chainring3: z.string().optional(),
  pads: z.string().optional(),
  links: z.string().optional(),
  tensioner: z.string().optional(),
  power: z.string().optional(),
  capacity: z.string().optional(),
});

type ComponentDataToIndex = z.infer<typeof ComponentIndexSchema>;

/**
 * Creates a descriptive string from a component object.
 * This string will be used to generate the vector embedding.
 * @param component The component data.
 * @returns A descriptive string.
 */
const createComponentVectorDocument = (component: ComponentDataToIndex): string => {
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
 * A Genkit flow that takes component data, generates a vector embedding,
 * and saves the full component document (with embedding) to Firestore.
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
    
    // 3. Prepare the full document to save to Firestore.
    const docToSave = {
      ...component,
      embedding,
    };
    
    // 4. Save the document to Firestore.
    const componentDocRef = doc(db, 'masterComponents', component.id);
    await setDoc(componentDocRef, docToSave, { merge: true });
  }
);
