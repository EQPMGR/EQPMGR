
'use server';

import { getServerAuth, getServerDb } from '@/backend';
import { ai } from '@/ai/genkit';
import { accessSecret } from '@/lib/secrets';

export async function getComponentForDebug(componentId: string): Promise<string> {
    if (!componentId) {
        return "Please provide a component ID.";
    }
    try {
        const db = await getServerDb();
        const docSnap = await db.getDoc('masterComponents', componentId);

        if (!docSnap.exists) {
            return `No component found with ID: ${componentId}`;
        }

        const data = docSnap.data;
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


export async function testOpenAIConnection(): Promise<string> {
    try {
        console.log('[Debug Action] Testing OpenAI connection...');
        await ai.embed('This is a test.');
        console.log('[Debug Action] OpenAI connection successful.');
        return 'Successfully connected to OpenAI and generated a test embedding.';
    } catch (error: any) {
        console.error('[Debug Action] OpenAI connection failed:', error);
        return `Connection failed: ${error.message}`;
    }
}

export async function getEnvironmentStatus(): Promise<object> {
    try {
        const openaiKey = process.env.OPENAI_API_KEY;

        return {
            openaiApiKeyStatus: openaiKey ? `Loaded (${openaiKey.substring(0, 4)}...${openaiKey.slice(-4)})` : 'NOT FOUND',
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
        const auth = await getServerAuth();
        const decodedToken = await auth.verifyIdToken(idToken, true);
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
