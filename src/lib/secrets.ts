
'use server';

/**
 * Accesses environment variable secrets.
 * @param secretName The name of the environment variable to access.
 * @returns The secret value as a string.
 */
export async function accessSecret(secretName: string): Promise<string> {
  // Only support environment variables (Netlify / Vercel / local dev).
  const val = process.env[secretName];
  if (val) return val;

  // If not present, provide a clear error explaining what to set.
  throw new Error(`Secret ${secretName} is not set. Please add environment variable ${secretName} to your deployment (Netlify/Vercel) or local environment.`);
}
