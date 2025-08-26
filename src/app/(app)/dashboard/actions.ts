
'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { getAdminAuth } from '@/lib/firebase-admin';
import type { WorkOrder } from '@/lib/types';
import { cookies } from 'next/headers';
import { toDate } from '@/lib/date-utils';


interface DashboardData {
    openWorkOrders: WorkOrder[];
}

export async function getDashboardData(): Promise<DashboardData> {
    try {
        const session = cookies().get('__session')?.value || '';
        if (!session) {
            // This is a more explicit way to handle unauthenticated state.
            // Throwing an error here will be caught below and can be handled by the client.
            throw new Error('User not authenticated.');
        }
        
        const adminAuth = await getAdminAuth();
        const decodedIdToken = await adminAuth.verifySessionCookie(session, true);
        const userId = decodedIdToken.uid;
        
        const adminDb = await getAdminDb();

        // Fetch open work orders by excluding completed or cancelled ones.
        const workOrdersQuery = adminDb.collection('workOrders')
            .where('userId', '==', userId)
            .where('status', 'not-in', ['completed', 'cancelled']);
            
        const workOrdersSnapshot = await workOrdersQuery.get();
        const openWorkOrders = workOrdersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: toDate(data.createdAt),
                // Ensure nested timestamps are also converted
                userConsent: {
                    ...data.userConsent,
                    timestamp: toDate(data.userConsent.timestamp)
                }
            } as WorkOrder;
        });

        return {
            openWorkOrders,
        };

    } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        // Instead of returning an empty array on auth errors, re-throw a more specific error.
        // This allows the client-side to know there was an auth problem.
        if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/invalid-session-cookie' || error.message === 'User not authenticated.') {
            throw new Error('Authentication session has expired. Please sign out and sign back in.');
        }
        // For other types of errors, throw a generic message.
        throw new Error("Could not fetch dashboard data from the server.");
    }
}
