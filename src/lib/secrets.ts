
'use server';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

/**
 * Accesses the value of a secret stored in Google Cloud Secret Manager.
 * @param secretName The name of the secret to access.
 * @returns The secret value as a string.
 */
export async function accessSecret(secretName: string): Promise<string> {
    if (!process.env.FIREBASE_PROJECT_ID) {
        throw new Error('FIREBASE_PROJECT_ID environment variable is not set.');
    }
  
  try {
    const [version] = await client.accessSecretVersion({
      name: `projects/${process.env.FIREBASE_PROJECT_ID}/secrets/${secretName}/versions/latest`,
    });

    const payload = version.payload?.data?.toString();
    if (!payload) {
      throw new Error(`Secret [${secretName}] has no payload.`);
    }
    
    return payload;

  } catch (error) {
    console.error(`Failed to access secret: ${secretName}`, error);
    throw new Error(`Could not access secret: ${secretName}. Ensure it exists and the service account has the 'Secret Manager Secret Accessor' role.`);
  }
}
