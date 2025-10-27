
'use server';

import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import type { WorkOrder } from '@/lib/types';
import { toDate } from '@/lib/date-utils';
import { cookies } from 'next/headers';

export async function fetchOpenWorkOrders(): Promise<WorkOrder[]> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('__session')?.value;

  if (!sessionCookie) {
    console.log("No session cookie found. Returning empty array.");
    return [];
  }

  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userId = decodedToken.uid;
    
    const adminDb = getAdminDb();
    const workOrdersQuery = adminDb.collection('workOrders')
      .where('userId', '==', userId)
      .where('status', 'in', ['pending', 'accepted', 'in-progress']);

    const snapshot = await workOrdersQuery.get();

    if (snapshot.empty) {
      return [];
    }

    const workOrders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: toDate(data.createdAt),
        userConsent: {
            ...data.userConsent,
            timestamp: toDate(data.userConsent.timestamp)
        }
      } as WorkOrder;
    });

    return workOrders;
  } catch (error: any) {
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/invalid-session-cookie') {
        console.log("Session cookie invalid, returning empty array.");
        return [];
    }
    console.error("Error fetching open work orders:", error);
    // In case of other errors, we don't want to crash the page.
    return [];
  }
}
