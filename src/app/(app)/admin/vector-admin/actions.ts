
'use server';
import { indexAllComponentsFlow } from '@/ai/flows/index-components';

export async function runVectorIndexing(): Promise<{ message: string }> {
  try {
    const result = await indexAllComponentsFlow();
    return result;
  } catch (error: any) {
    // Log the full error on the server for debugging purposes.
    console.error('Error during vector indexing flow:', error);
    // Re-throw the specific error to be displayed on the client.
    throw new Error(error.message || 'An unknown error occurred during the indexing process.');
  }
}
