'use server';

import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import type { Equipment, WorkOrder } from '@/lib/types';
import { toDate } from '@/lib/date-utils';
import { accessSecret } from '@/lib/secrets';

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  start_date: string;
  gear_id: string | null;
}

interface StravaTokenData {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}


export async function fetchRecentStravaActivities(idToken: string): Promise<{ activities?: StravaActivity[]; error?: string }> {
    if (!idToken) {
        return { error: 'User not authenticated.' };
    }

    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();
        const decodedToken = await adminAuth.verifyIdToken(idToken, true);
        const userId = decodedToken.uid;
        
        const userDocRef = adminDb.collection('users').doc(userId);
        const userDocSnap = await userDocRef.get();

        const userData = userDocSnap.data();

        if (!userDocSnap.exists || !userData?.strava) {
             return { error: 'Could not authenticate with Strava. Please reconnect your account.' };
        }

        let { accessToken, refreshToken, expiresAt, processedActivities } = userData.strava;

        // Refresh token if it's about to expire in the next 5 minutes
        if (Date.now() / 1000 > expiresAt - 300) {
            console.log("Strava token expired, refreshing...");
            const [clientId, clientSecret] = await Promise.all([
              accessSecret('NEXT_PUBLIC_STRAVA_CLIENT_ID'),
              accessSecret('STRAVA_CLIENT_SECRET'),
            ]);

            if (!clientId || !clientSecret) {
                throw new Error('Server is not configured for Strava integration.');
            }

            const response = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error("Strava token refresh failed:", errorBody);
                throw new Error(`Strava token refresh failed: ${errorBody.message || 'Check Server Logs'}`);
            }

            const newTokens = await response.json();
            
            const newStravaData = {
                ...userData.strava,
                accessToken: newTokens.access_token,
                refreshToken: newTokens.refresh_token || refreshToken,
                expiresAt: newTokens.expires_at,
            };
            
            await userDocRef.update({ 
                strava: newStravaData 
            });
            
            accessToken = newTokens.access_token;
        }

        const activitiesResponse = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            cache: 'no-store',
        });

        if (!activitiesResponse.ok) {
            const errorBody = await activitiesResponse.json();
            if (activitiesResponse.status === 401) {
                return { error: 'Strava authorization failed. Please disconnect and reconnect your account.'}
            }
            return { error: `Failed to fetch from Strava: ${errorBody.message || JSON.stringify(errorBody)}` };
        }

        const allActivities: StravaActivity[] = await activitiesResponse.json();
        const processedActivityIds = new Set(processedActivities || []);

        const activities = allActivities.filter(a => !processedActivityIds.has(String(a.id)));
        
        return { activities };

    } catch (error: any) {
        console.error("Error fetching Strava activities:", error);
        return { error: error.message || 'An unknown error occurred during Strava sync.' };
    }
}

export async function fetchUserBikes(idToken: string): Promise<{ bikes?: Equipment[]; error?: string; }> {
    if (!idToken) {
        return { error: 'User not authenticated.' };
    }

    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();
        const decodedIdToken = await adminAuth.verifyIdToken(idToken, true);

        const q = adminDb.collection(`users/${decodedIdToken.uid}/equipment`).where('type', '!=', 'Cycling Shoes');
        const querySnapshot = await q.get();

        const bikes = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                purchaseDate: toDate(data.purchaseDate),
                maintenanceLog: (data.maintenanceLog || []).map((log: any) => ({
                    ...log,
                    date: toDate(log.date)
                })),
            } as Equipment
        });

        return { bikes };

    } catch(error: any) {
        console.error("Error fetching user bikes: ", error);
        return { error: error.message || "An unknown error occurred." };
    }
}

export async function checkStravaConnection(idToken: string): Promise<{ connected: boolean; error?: string }> {
    if (!idToken) {
        return { connected: false, error: 'User not authenticated.' };
    }

    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();
        const decodedToken = await adminAuth.verifyIdToken(idToken, true);
        const userId = decodedToken.uid;

        const userDocRef = adminDb.collection('users').doc(userId);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists || !userDocSnap.data()?.strava) {
            return { connected: false };
        }

        const stravaData = userDocSnap.data()?.strava;
        const hasRequiredFields = stravaData.accessToken && stravaData.refreshToken && stravaData.expiresAt;

        return { connected: !!hasRequiredFields };

    } catch (error: any) {
        console.error("Error checking Strava connection:", error);
        return { connected: false, error: error.message || 'An unknown error occurred.' };
    }
}

export async function assignStravaActivityToAction({
    idToken,
    activity,
    equipmentId,
}: {
    idToken: string;
    activity: StravaActivity;
    equipmentId: string;
}): Promise<{ success: boolean; message: string; }> {
    if (!idToken || !activity || !equipmentId) {
        return { success: false, message: 'Missing required data.' };
    }
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken, true);
        const userId = decodedToken.uid;

        const equipmentRef = adminDb.doc(`users/${userId}/equipment/${equipmentId}`);
        const userRef = adminDb.doc(`users/${userId}`);

        const batch = adminDb.batch();

        batch.update(equipmentRef, {
            totalDistance: admin.firestore.FieldValue.increment(activity.distance / 1000),
            totalHours: admin.firestore.FieldValue.increment(activity.moving_time / 3600),
        });

        batch.set(userRef, {
            strava: {
                processedActivities: admin.firestore.FieldValue.arrayUnion(String(activity.id))
            }
        }, { merge: true });

        await batch.commit();

        return { success: true, message: `Activity '${activity.name}' assigned.` };

    } catch (error: any) {
        console.error("Error assigning Strava activity:", error);
        return { success: false, message: error.message || "An unknown server error occurred." };
    }
}

export async function fetchOpenWorkOrders(userId: string): Promise<WorkOrder[]> {
    try {
        const workOrdersRef = getAdminDb().collection('workOrders');
        const q = workOrdersRef
            .where('userId', '==', userId)
            .where('status', 'in', ['pending', 'accepted', 'in-progress']);

        const querySnapshot = await q.get();
        if (querySnapshot.empty) {
            return [];
        }

        return querySnapshot.docs.map(doc => {
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
    } catch (error: any) {
        console.error("Error fetching open work orders:", error);
        // In a real app, you'd want more robust error handling,
        // but for now, we'll return an empty array on failure.
        return [];
    }
}