
'use server';

import { getDoc } from 'firebase/firestore';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { ai } from '@/ai/genkit';
import { textEmbedding004 } from '@genkit-ai/googleai';
import { accessSecret } from '@/lib/secrets';

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

export async function testIdTokenVerification(idToken: string): Promise<string> {
    if (!idToken) {
        return "Error: No ID token provided to server action.";
    }
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken, true);
        return `Success! Token verified for UID: ${decodedToken.uid}, Email: ${decodedToken.email}`;
    } catch (error: any) {
        console.error("[Debug Action] ID Token Verification failed:", error);
        return `Verification Failed: ${error.message} (Code: ${error.code})`;
    }
}

export async function testSecret(secretName: string): Promise<string> {
    if (!secretName) {
        return "Error: No secret name provided.";
    }
    try {
        const secretValue = await accessSecret(secretName);
        if (secretValue) {
            // Return a masked version for security
            const maskedValue = `${secretValue.substring(0, 4)}...${secretValue.slice(-4)}`;
            return `Successfully accessed secret '${secretName}'. Value: ${maskedValue}`;
        }
        return `Accessed secret '${secretName}', but it appears to be empty.`;
    } catch (error: any) {
        console.error(`[Debug Action] Failed to access secret ${secretName}:`, error);
        return `Failed to access secret '${secretName}': ${error.message}`;
    }
}
