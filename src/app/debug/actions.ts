
'use server';

import { getDoc } from 'firebase/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { ai } from '@/ai/genkit';
import { textEmbedding004 } from '@genkit-ai/googleai';

export async function getComponentForDebug(componentId: string): Promise<string> {
    if (!componentId) {
        return "Please provide a component ID.";
    }
    try {
        const docRef = adminDb.doc(`masterComponents/${componentId}`);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return `No component found with ID: ${componentId}`;
        }

        const data = docSnap.data();
        // Check for embedding and show summary
        const embeddingInfo = data?.embedding 
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


export async function testVertexAIConnection(): Promise<string> {
    try {
        console.log('[Debug Action] Testing Vertex AI connection...');
        await ai.embed({
            embedder: textEmbedding004,
            content: 'This is a test.',
        });
        console.log('[Debug Action] Vertex AI connection successful.');
        return 'Successfully connected to Vertex AI and generated a test embedding.';
    } catch (error: any) {
        console.error('[Debug Action] Vertex AI connection failed:', error);
        return `Connection failed: ${error.message}`;
    }
}

export async function getEnvironmentStatus(): Promise<object> {
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    const gaeCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    return {
      geminiApiKeyStatus: geminiKey ? `Loaded (${geminiKey.substring(0, 4)}...${geminiKey.slice(-4)})` : 'NOT FOUND',
      googleApplicationCredentialsStatus: gaeCredentials ? `Loaded (Path: ${gaeCredentials})` : 'NOT FOUND (This is expected in many environments, Admin SDK may use default credentials)',
      nodeEnv: process.env.NODE_ENV || 'Not set'
    };
  } catch (error: any) {
    return {
      error: 'Failed to read environment variables.',
      message: error.message,
    };
  }
}
