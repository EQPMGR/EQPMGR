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
    // This is the correct, efficient query. If it fails, it's because a composite index is needed.
    // The error log on the server will contain a link to create it automatically.
    const workOrdersQuery = adminDb.collection('workOrders')
      .where('userId', '==', userId)
      .where('status', 'in', ['pending', 'accepted', 'in-progress']);

    const snapshot = await workOrdersQuery.get();

    if (snapshot.empty) {
      return [];
    }

    const userWorkOrders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: toDate(data.createdAt),
        // Ensure nested timestamps are converted as well
        userConsent: {
            ...data.userConsent,
            timestamp: data.userConsent?.timestamp ? toDate(data.userConsent.timestamp) : new Date()
        }
      } as WorkOrder;
    });

    return userWorkOrders;

  } catch (error: any) {
    // Log the full error to the server console. This is crucial for debugging.
    // If an index is missing, Firebase will provide a link to create it in this error log.
    console.error("Error fetching open work orders. This might be due to a missing Firestore index:", error);

    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/invalid-session-cookie') {
        console.log("Session cookie invalid, returning empty array.");
        return [];
    }

    // In case of other errors, we don't want to crash the page.
    return [];
  }
}
