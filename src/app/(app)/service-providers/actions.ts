
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { ServiceProvider, WorkOrder } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

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

export async function submitWorkOrderAction(workOrderData: Omit<WorkOrder, 'id' | 'createdAt' | 'status'>): Promise<{ success: boolean; message: string }> {
  if (!workOrderData.userId || !workOrderData.serviceProviderId) {
    return { success: false, message: 'User or Service Provider ID is missing.' };
  }
  
  try {
    const workOrdersCollection = adminDb.collection('workOrders');
    const newWorkOrderRef = workOrdersCollection.doc();

    const newWorkOrder: WorkOrder = {
      id: newWorkOrderRef.id,
      ...workOrderData,
      status: 'pending',
      createdAt: Timestamp.now(),
    };

    await newWorkOrderRef.set(newWorkOrder);

    return {
      success: true,
      message: `Work order successfully submitted to ${workOrderData.providerName}.`,
    };

  } catch (error: any) {
    console.error("Failed to submit work order:", error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred while submitting the work order.',
    };
  }
}
