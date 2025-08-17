

'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { ServiceProvider } from '@/lib/types';

export async function getServiceProviders(): Promise<ServiceProvider[]> {
  try {
    const providersSnapshot = await adminDb.collection('serviceProviders').get();
    const providers = providersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ServiceProvider));
    return providers;
  } catch (error) {
    console.error("Error fetching service providers:", error);
    // Be more descriptive with the error thrown
    if ((error as any).code === 'permission-denied') {
        throw new Error('You do not have permission to access service providers. Please check your Firestore security rules.');
    }
    throw new Error("Could not fetch service providers from the database.");
  }
}
