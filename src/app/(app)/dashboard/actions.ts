
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { adminAuth } from '@/lib/firebase-admin';
import type { WorkOrder } from '@/lib/types';
import { cookies } from 'next/headers';
import { toDate } from '@/lib/date-utils';


interface DashboardData {
    openWorkOrders: any[]; // Use `any` to allow for serialized dates
}

export async function getDashboardData(): Promise<DashboardData> {
    try {
        const session = cookies().get('__session')?.value;
        if (!session) {
            throw new Error('User not authenticated.');
        }
        
        const decodedIdToken = await adminAuth.verifySessionCookie(session, true);
        const userId = decodedIdToken.uid;
        
        const workOrdersQuery = adminDb.collection('workOrders')
            .where('userId', '==', userId)
            .where('status', '!=', 'Completed');
            
        const workOrdersSnapshot = await workOrdersQuery.get();
        
        const openWorkOrders = workOrdersSnapshot.docs.map(doc => {
            const data = doc.data();
            
            // This is the new, safer serialization logic.
            // Convert all date objects to ISO strings before returning.
            const createdAtTimestamp = data.createdAt ? toDate(data.createdAt).toISOString() : new Date().toISOString();
            const userConsentTimestamp = data.userConsent?.timestamp ? toDate(data.userConsent.timestamp).toISOString() : new Date().toISOString();


            return {
                ...data,
                id: doc.id,
                createdAt: createdAtTimestamp,
                userConsent: {
                    ...data.userConsent,
                    timestamp: userConsentTimestamp
                }
            };
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
