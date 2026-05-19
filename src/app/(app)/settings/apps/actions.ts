
'use server';

import https from 'https';
import { getServerAuth, getServerDb } from '@/backend';
import type { Equipment } from '@/lib/types';
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
  alreadySynced?: boolean;
}

async function ensureStravaTokenIsValid(
    userId: string,
    db: any,
    stravaData: any
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number; }> {
    const { accessToken, refreshToken, expiresAt } = stravaData;
    if (!accessToken || !refreshToken || !expiresAt) {
        throw new Error('Strava credentials are missing or corrupted. Please reconnect your account.');
    }

    if (Date.now() / 1000 <= expiresAt - 300) {
        return { accessToken, refreshToken, expiresAt };
    }

    console.log('Strava token expired, refreshing...');
    const [clientId, clientSecret] = await Promise.all([
        accessSecret('NEXT_PUBLIC_STRAVA_CLIENT_ID'),
        accessSecret('STRAVA_CLIENT_SECRET'),
    ]);

    if (!clientId || !clientSecret) {
        throw new Error('Server is not configured for Strava integration.');
    }

    const fetchOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    };

    if (process.env.NODE_ENV !== 'production') {
        fetchOptions.agent = new https.Agent({ rejectUnauthorized: false });
    }

    const response = await fetch('https://www.strava.com/oauth/token', fetchOptions);
    const data = await response.json();

    if (!response.ok) {
        console.error('Strava token refresh failed:', data);
        if ([400, 401, 403].includes(response.status)) {
            await clearStravaConnection(userId, db);
        }
        throw new Error(
            data?.message ||
            'Strava token refresh failed. Your Strava connection may have been revoked. Please reconnect your account.'
        );
    }

    const newStravaData = {
        ...stravaData,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: data.expires_at,
    };

    await db.updateDoc('app_users', userId, {
        strava: newStravaData,
    });

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: data.expires_at,
    };
}

const STRAVA_RIDE_TYPES = new Set(['Ride', 'VirtualRide', 'EBikeRide']);
const INITIAL_STRAVA_RIDE_LIMIT = 250;
const REGULAR_STRAVA_RIDE_LIMIT = 25;
const STRAVA_PAGE_SIZE = 30;

async function fetchStravaBikeActivities(accessToken: string, maxRides: number): Promise<StravaActivity[]> {
    const fetchOptions: RequestInit = {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
    };

    if (process.env.NODE_ENV !== 'production') {
        fetchOptions.agent = new https.Agent({ rejectUnauthorized: false });
    }

    const rides: StravaActivity[] = [];
    let page = 1;

    while (rides.length < maxRides) {
        const activitiesResponse = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${STRAVA_PAGE_SIZE}&page=${page}`, fetchOptions);
        if (!activitiesResponse.ok) {
            const errorBody = await activitiesResponse.json();
            const error = new Error(`Failed to fetch from Strava: ${errorBody?.message || JSON.stringify(errorBody)}`) as any;
            error.status = activitiesResponse.status;
            throw error;
        }

        const rawActivities: StravaActivity[] = await activitiesResponse.json();
        const rideActivities = rawActivities.filter(activity => STRAVA_RIDE_TYPES.has(activity.type));
        rides.push(...rideActivities);

        if (rawActivities.length < STRAVA_PAGE_SIZE) {
            break;
        }

        page += 1;
    }

    return rides.slice(0, maxRides);
}

async function clearStravaConnection(userId: string, db: any): Promise<void> {
    try {
        await db.updateDoc('app_users', userId, { strava: null });
    } catch (error) {
        console.error('Unable to clear stale Strava credentials for user', userId, error);
    }
}

export async function fetchRecentStravaActivities(idToken: string): Promise<{ activities?: StravaActivity[]; error?: string }> {
    if (!idToken) {
        return { error: 'User not authenticated.' };
    }

    try {
        const auth = await getServerAuth();
        const db = await getServerDb();
        const decodedToken = await auth.verifyIdToken(idToken, true);
        const userId = decodedToken.uid;

        const userDocSnap = await db.getDoc('app_users', userId);
        const userData = userDocSnap.data;

        if (!userDocSnap.exists || !userData?.strava) {
            return { error: 'Could not authenticate with Strava. Please reconnect your account.' };
        }

        const { accessToken, refreshToken, expiresAt, processedActivities } = userData.strava;
        let validTokens;

        try {
            validTokens = await ensureStravaTokenIsValid(userId, db, {
                accessToken,
                refreshToken,
                expiresAt,
            });
        } catch (err: any) {
            return { error: err.message || 'Your Strava connection is no longer valid. Please reconnect your account.' };
        }

        const maxRides = Array.isArray(processedActivities) && processedActivities.length > 0
            ? REGULAR_STRAVA_RIDE_LIMIT
            : INITIAL_STRAVA_RIDE_LIMIT;

        let allRideActivities: StravaActivity[];
        try {
            allRideActivities = await fetchStravaBikeActivities(validTokens.accessToken, maxRides);
        } catch (err: any) {
            if (err?.status === 401 || err?.status === 403) {
                await clearStravaConnection(userId, db);
                return { error: 'Strava authorization failed. Please disconnect and reconnect your account.' };
            }
            throw err;
        }

        const processedActivityIds = new Set(processedActivities || []);
        const activities = allRideActivities.map(activity => ({
            ...activity,
            alreadySynced: processedActivityIds.has(String(activity.id)),
        }));

        return {
            activities,
        };
    } catch (error: any) {
        console.error('Error fetching Strava activities:', error);
        return { error: error.message || 'An unknown error occurred during Strava sync.' };
    }
}

export async function fetchUserBikes(idToken: string): Promise<{ bikes?: Equipment[]; error?: string; }> {
    if (!idToken) {
        return { error: 'User not authenticated.' };
    }

    try {
        const auth = await getServerAuth();
        const db = await getServerDb();
        const decodedIdToken = await auth.verifyIdToken(idToken, true);

        const querySnapshot = await db.getSubDocs(
            `app_users/${decodedIdToken.uid}`,
            decodedIdToken.uid,
            'equipment',
            { type: 'where', field: 'type', op: '!=', value: 'Cycling Shoes' }
        );

        const bikes = querySnapshot.docs.map(doc => {
            const data = doc.data;
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
        const auth = await getServerAuth();
        const db = await getServerDb();
        const decodedToken = await auth.verifyIdToken(idToken, true);
        const userId = decodedToken.uid;

        const userDocSnap = await db.getDoc('app_users', userId);
        const userData = userDocSnap.data;

        if (!userDocSnap.exists || !userData?.strava) {
            return { connected: false };
        }

        let validTokens;
        try {
            validTokens = await ensureStravaTokenIsValid(userId, db, userData.strava);
        } catch (err: any) {
            return {
                connected: false,
                error: err.message || 'Your Strava connection is no longer valid. Please reconnect your account.',
            };
        }

        const fetchOptions: RequestInit = {
            headers: {
                Authorization: `Bearer ${validTokens.accessToken}`,
            },
            cache: 'no-store',
        };

        if (process.env.NODE_ENV !== 'production') {
            fetchOptions.agent = new https.Agent({ rejectUnauthorized: false });
        }

        const verifyResponse = await fetch('https://www.strava.com/api/v3/athlete', fetchOptions);
        if (!verifyResponse.ok) {
            if ([401, 403].includes(verifyResponse.status)) {
                await clearStravaConnection(userId, db);
                return {
                    connected: false,
                    error: 'Strava authorization failed. Please reconnect your account.',
                };
            }
            return {
                connected: false,
                error: 'Unable to verify Strava connection at this time.',
            };
        }

        return { connected: true };
    } catch (error: any) {
        console.error('Error checking Strava connection:', error);
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

    const auth = await getServerAuth();
    const db = await getServerDb();

    try {
        const decodedToken = await auth.verifyIdToken(idToken, true);
        const userId = decodedToken.uid;

        const batch = db.batch();

        batch.updateInSubcollection(`app_users/${userId}`, 'equipment', equipmentId, {
            totalDistance: db.increment(activity.distance / 1000),
            totalHours: db.increment(activity.moving_time / 3600),
        });

        const userDocSnap = await db.getDoc('app_users', userId);
        const existingStrava = userDocSnap.exists ? userDocSnap.data?.strava || {} : {};
        const existingProcessedActivities: string[] = Array.isArray(existingStrava.processedActivities)
            ? existingStrava.processedActivities.map(String)
            : [];
        const mergedProcessedActivities = Array.from(new Set([...existingProcessedActivities, String(activity.id)]));

        const updatedStrava = {
            ...existingStrava,
            processedActivities: mergedProcessedActivities,
        };

        if (!userDocSnap.exists) {
            const fallbackEmail = decodedToken.email || `${userId}@no-email.local`;
            batch.set('app_users', userId, {
                email: fallbackEmail,
                emailVerified: decodedToken.email_verified ?? false,
                strava: updatedStrava,
            });
        } else {
            batch.update('app_users', userId, {
                strava: updatedStrava,
            });
        }

        await batch.commit();

        return { success: true, message: `Activity '${activity.name}' assigned.` };

    } catch (error: any) {
        console.error("Error assigning Strava activity:", error);
        return { success: false, message: error.message || "An unknown server error occurred." };
    }
}
