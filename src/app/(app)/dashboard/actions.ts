
'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { getAdminAuth } from '@/lib/firebase-admin';
import type { WorkOrder, Equipment } from '@/lib/types';
import { cookies } from 'next/headers';
import { toDate } from '@/lib/date-utils';


interface DashboardData {
    equipmentCount: number;
    openWorkOrders: WorkOrder[];
    // We can add more dashboard-specific data here in the future
}

export async function getDashboardData(): Promise<DashboardData> {
    try {
        const session = cookies().get('__session')?.value || '';
        if (!session) {
            throw new Error("User not authenticated");
        }
        const adminAuth = await getAdminAuth();
        const decodedIdToken = await adminAuth.verifySessionCookie(session, true);
        const userId = decodedIdToken.uid;
        
        const adminDb = await getAdminDb();

        // Fetch equipment count
        const equipmentQuery = adminDb.collection('users').doc(userId).collection('equipment');
        const equipmentSnapshot = await equipmentQuery.get();
        const equipmentCount = equipmentSnapshot.size;
        
        // Fetch open work orders
        const workOrdersQuery = adminDb.collection('workOrders')
            .where('userId', '==', userId)
            .where('status', 'in', ['pending', 'in-progress', 'accepted']);
            
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
            equipmentCount,
            openWorkOrders,
        };

    } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        if (error.message === "User not authenticated") {
            throw error;
        }
        throw new Error("Could not fetch dashboard data from the server.");
    }
}
