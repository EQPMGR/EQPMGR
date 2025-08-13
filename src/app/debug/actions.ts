
'use server';

import { doc, getDoc } from 'firebase/firestore';
import { adminDb } from '@/lib/firebase-admin';

export async function getComponentForDebug(componentId: string): Promise<string> {
    if (!componentId) {
        return "Please provide a component ID.";
    }
    try {
        const docRef = doc(adminDb, 'masterComponents', componentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return `No component found with ID: ${componentId}`;
        }

        const data = docSnap.data();
        // Check for embedding and show summary
        const embeddingInfo = data.embedding 
            ? `Embedding found with ${data.embedding.length} dimensions.` 
            : 'No embedding field found.';
        
        const returnData = {
            ...data,
            embedding: embeddingInfo, // Replace large array with summary
        };

        return JSON.stringify(returnData, null, 2);

    } catch (error: any) {
        console.error("Debug fetch error:", error);
        return `Error fetching component: ${error.message}`;
    }
}
