
'use server';
/**
 * @fileOverview A flow for indexing component data into Firestore.
 * This flow now handles both creating the embedding and saving the component data.
 */
import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
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
 * A Genkit flow that takes all master components, generates vector embeddings for those
 * that need it, and saves them back to Firestore.
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
    // 1. Fetch all master components from Firestore.
    const componentsSnapshot = await getDocs(collection(db, 'masterComponents'));
    const allComponents = componentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterComponent));
    
    // 2. Filter for components that need indexing.
    const componentsToIndex = allComponents.filter(c => !c.embedding || !Array.isArray(c.embedding) || c.embedding.length === 0);
    
    if (componentsToIndex.length === 0) {
        return { message: "All components are already indexed.", indexedCount: 0 };
    }

    // 3. Process components in batches to generate embeddings and write to Firestore.
    const batchSize = 20; // Process in batches to avoid overwhelming the API
    let indexedCount = 0;
    const batch = writeBatch(db);

    for (let i = 0; i < componentsToIndex.length; i++) {
        const component = componentsToIndex[i];
        
        // Generate embedding for the component
        const vectorDocument = createComponentVectorDocument(component);
        const embedding = await ai.embed({
            embedder: textEmbedding004,
            content: vectorDocument,
        });

        // Add the update to the batch
        const docRef = doc(db, 'masterComponents', component.id);
        batch.update(docRef, { embedding: embedding });
        indexedCount++;

        // Commit the batch every batchSize components or on the last component
        if ((i + 1) % batchSize === 0 || i === componentsToIndex.length - 1) {
            await batch.commit();
        }
    }

    return {
      message: `Successfully indexed ${indexedCount} new components.`,
      indexedCount,
    };
  }
);


/**
 * A Genkit flow that takes a single component data, generates a vector embedding,
 * and saves the full component document (with embedding) to Firestore.
 */
export const indexComponentFlow = ai.defineFlow(
  {
    name: 'indexComponentFlow',
    inputSchema: z.any(), // Accepts a MasterComponent-like object
    outputSchema: z.void(),
  },
  async (component: MasterComponent) => {
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
