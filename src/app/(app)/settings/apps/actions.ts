'use server';

import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import type { Equipment, UserComponent, Component, MasterComponent } from '@/lib/types';
import { toDate, toNullableDate } from '@/lib/date-utils';
import { simulateWear } from '@/ai/flows/simulate-wear';

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
            const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
            const clientSecret = process.env.STRAVA_CLIENT_SECRET;

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
                // Attempt to throw an error that is friendlier
                throw new Error(`Strava token refresh failed: ${errorBody.message || 'Check Server Logs'}`);
            }

            const newTokens = await response.json();
            
            // --- FIX: Explicitly update the strava field ---
            const newStravaData = {
                ...userData.strava, // Preserve existing fields like processedActivities, etc.
                accessToken: newTokens.access_token,
                refreshToken: newTokens.refresh_token || refreshToken, // Use new refresh token if provided
                expiresAt: newTokens.expires_at,
            };
            
            // Use update to specifically modify the 'strava' field, which is much safer.
            await userDocRef.update({ 
                strava: newStravaData 
            });
            // ------------------------------------------------
            
            accessToken = newTokens.access_token;
        }

        const activitiesResponse = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            cache: 'no-store', // This is critical to prevent hanging requests
        });

        if (!activitiesResponse.ok) {
            const errorBody = await activitiesResponse.json();
            // Check for specific token errors and return a clean error
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
        // Return the error message to the client component to display the toast
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

        // Check if token exists and is valid
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

        // 1. Get the equipment and its components
        const equipmentRef = adminDb.doc(`users/${userId}/equipment/${equipmentId}`);
        const componentsSnapshot = await equipmentRef.collection('components').get();
        
        const userComponents: UserComponent[] = componentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserComponent));
        
        // 2. Run wear simulation
        const wearAndTearData = JSON.stringify(userComponents.map(c => ({ name: c.name, wear: `${c.wearPercentage}%` })));

        const simulationResult = await simulateWear({
            equipmentType: 'Road Bike', // This could be dynamic later
            workoutType: activity.type,
            distance: activity.distance / 1000, // convert meters to km
            duration: activity.moving_time / 60, // convert seconds to minutes
            intensity: 'medium', // Placeholder, could be derived from activity data
            environmentalConditions: 'mixed', // Placeholder
            wearAndTearData,
        });

        // 3. Prepare batch write
        const batch = adminDb.batch();

        // 4. Update equipment totals
        batch.update(equipmentRef, {
            totalDistance: admin.firestore.FieldValue.increment(activity.distance / 1000),
            totalHours: admin.firestore.FieldValue.increment(activity.moving_time / 3600),
        });

        // 5. Update component wear
        simulationResult.componentWear.forEach(simulatedComp => {
            const componentToUpdate = userComponents.find(c => c.name === simulatedComp.componentName);
            if (componentToUpdate) {
                const componentRef = equipmentRef.collection('components').doc(componentToUpdate.id);
                batch.update(componentRef, { wearPercentage: simulatedComp.wearPercentage });
            }
        });
        
        // 6. Mark activity as processed
        const userRef = adminDb.doc(`users/${userId}`);
        batch.set(userRef, {
            strava: {
                processedActivities: admin.firestore.FieldValue.arrayUnion(String(activity.id))
            }
        }, { merge: true });

        // 7. Commit batch
        await batch.commit();

        return { success: true, message: `Activity assigned and wear calculated for ${activity.name}.` };

    } catch (error: any) {
        console.error("Error assigning Strava activity:", error);
        return { success: false, message: error.message || "An unknown server error occurred." };
    }
}
