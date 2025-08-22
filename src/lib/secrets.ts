
'use server';

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

/**
 * Accesses a secret from Google Cloud Secret Manager.
 * @param secretName The name of the secret to access.
 * @returns The secret value as a string.
 */
export async function accessSecret(secretName: string): Promise<string> {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID is not set in the environment.');
    }

    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });

    const payload = version.payload?.data?.toString();
    if (!payload) {
      throw new Error(`Secret ${secretName} has no payload.`);
    }

    return payload;
  } catch (error) {
    console.error(`Failed to access secret: ${secretName}`, error);
    // In a production environment, you might want to handle this more gracefully
    // For now, we re-throw to make debugging clear.
    throw new Error(`Could not access secret: ${secretName}. Ensure it exists and the service account has the 'Secret Manager Secret Accessor' role.`);
  }
}
