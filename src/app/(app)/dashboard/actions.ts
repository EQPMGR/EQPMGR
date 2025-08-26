
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
        const session = cookies().get('__session')?.value;
        if (!session) {
            throw new Error('User not authenticated.');
        }
        
        const adminAuth = await getAdminAuth();
        const decodedIdToken = await adminAuth.verifySessionCookie(session, true);
        const userId = decodedIdToken.uid;
        
        const adminDb = await getAdminDb();

        const workOrdersQuery = adminDb.collection('workOrders')
            .where('userId', '==', userId)
            .where('status', 'not-in', ['completed', 'cancelled']);
            
        const workOrdersSnapshot = await workOrdersQuery.get();
        const openWorkOrders = workOrdersSnapshot.docs.map(doc => {
            const data = doc.data();
            
            // Defensive check for userConsent and its timestamp
            const userConsent = data.userConsent && data.userConsent.timestamp ? {
                ...data.userConsent,
                timestamp: toDate(data.userConsent.timestamp)
            } : {
                consentGiven: data.userConsent?.consentGiven || false,
                timestamp: new Date()
            };

            return {
                ...data,
                id: doc.id,
                createdAt: data.createdAt ? toDate(data.createdAt) : new Date(),
                userConsent: userConsent
            } as WorkOrder;
        });

        return {
            openWorkOrders,
        };

    } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/invalid-session-cookie') {
            throw new Error('Authentication session has expired. Please sign out and sign back in.');
        }
        // Throw a more generic but informative error for other cases
        throw new Error("Could not fetch dashboard data from the server. An unexpected error occurred.");
    }
}
