
'use server';

import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import type { Equipment, MaintenanceLog } from '@/lib/types';
import { toDate } from '@/lib/date-utils';

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  start_date: string;
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

        if (!userDocSnap.exists() || !userDocSnap.data()?.strava) {
             return { error: 'Could not authenticate with Strava. Please reconnect your account.' };
        }

        let { accessToken, refreshToken, expiresAt } = userDocSnap.data()?.strava;

        if (Date.now() / 1000 > expiresAt - 300) {
            console.log("Strava token expired, refreshing...");
            const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
            const clientSecret = process.env.STRAVA_CLIENT_SECRET;

            const response = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId!,
                    client_secret: clientSecret!,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error("Strava token refresh failed:", errorBody);
                throw new Error('Could not refresh Strava token.');
            }

            const newTokens = await response.json();
            const newStravaData = {
                ...userDocSnap.data()?.strava,
                accessToken: newTokens.access_token,
                refreshToken: newTokens.refresh_token,
                expiresAt: newTokens.expires_at,
            };
            
            await userDocRef.set({ strava: newStravaData }, { merge: true });
            
            accessToken = newTokens.access_token;
        }

        const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=10', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorBody = await response.json();
            return { error: `Failed to fetch from Strava: ${errorBody.message || JSON.stringify(errorBody)}` };
        }

        const activities: StravaActivity[] = await response.json();
        return { activities };

    } catch (error: any) {
        console.error("Error fetching Strava activities:", error);
        return { error: error.message || 'An unknown error occurred.' };
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
                maintenanceLog: (data.maintenanceLog || []).map((log: MaintenanceLog) => ({
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
