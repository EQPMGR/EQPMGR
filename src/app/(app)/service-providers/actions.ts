

'use server';

import { getServerDb } from '@/backend';
import type { ServiceProvider, WorkOrder } from '@/lib/types';

export async function getServiceProviders(): Promise<ServiceProvider[]> {
  try {
    const db = await getServerDb();
    const providersSnapshot = await db.getDocs<ServiceProvider>('serviceProviders');
    const providers = providersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data,
    } as ServiceProvider));
    return providers;
  } catch (error) {
    console.error("Error fetching service providers:", error);
    // Be more descriptive with the error thrown
    if ((error as any).code === 'permission-denied') {
        throw new Error('You do not have permission to access service providers. Please check your backend security rules.');
    }
    throw new Error("Could not fetch service providers from the database.");
  }
}

export async function submitWorkOrderAction(workOrderData: Omit<WorkOrder, 'id' | 'createdAt' | 'status'>): Promise<{ success: boolean; message: string }> {
  if (!workOrderData.userId || !workOrderData.serviceProviderId) {
    return { success: false, message: 'User or Service Provider ID is missing.' };
  }

  try {
    const db = await getServerDb();
    const newWorkOrderId = db.generateId();

    const newWorkOrder: WorkOrder = {
      id: newWorkOrderId,
      ...workOrderData,
      status: 'pending',
      createdAt: new Date(),
      userConsent: {
          ...workOrderData.userConsent,
          timestamp: workOrderData.userConsent.timestamp instanceof Date
            ? workOrderData.userConsent.timestamp
            : new Date(workOrderData.userConsent.timestamp),
      },
    };

    await db.setDoc('workOrders', newWorkOrderId, newWorkOrder);

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
