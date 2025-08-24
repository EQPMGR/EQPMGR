
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
            // Instead of throwing an error, return an empty state.
            // This handles cases where the client-side calls this before session is fully established.
            return { openWorkOrders: [] };
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
        // If the error is due to an invalid session token, it's similar to not being authenticated.
        if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/invalid-session-cookie') {
            return { openWorkOrders: [] };
        }
        throw new Error("Could not fetch dashboard data from the server.");
    }
}
