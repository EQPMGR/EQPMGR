
'use server';

import https from 'https';
import { createClient } from '@supabase/supabase-js';
import { getServerAuth, getServerDb } from '@/backend';
import type { Equipment } from '@/lib/types';
import { toDate } from '@/lib/date-utils';
import { accessSecret } from '@/lib/secrets';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

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
    
    console.log('[ensureStravaTokenIsValid] Checking token expiry', {
        userId,
        expiresAt,
        now: Math.floor(Date.now() / 1000),
        expired: Math.floor(Date.now() / 1000) > expiresAt - 300,
    });
    
    if (!accessToken || !refreshToken || !expiresAt) {
        throw new Error('Strava credentials are missing or corrupted. Please reconnect your account.');
    }

    if (Math.floor(Date.now() / 1000) <= expiresAt - 300) {
        console.log('[ensureStravaTokenIsValid] Token still valid, returning as-is');
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
            'User-Agent': 'EQPMGR/1.0',
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
            const errorText = await activitiesResponse.text();
            let errorMessage = 'Unknown error';
            try {
                const errorBody = JSON.parse(errorText);
                errorMessage = errorBody?.message || JSON.stringify(errorBody);
            } catch {
                errorMessage = errorText || activitiesResponse.statusText;
            }
            
            console.error('[fetchStravaBikeActivities] Strava API error response', {
                status: activitiesResponse.status,
                statusText: activitiesResponse.statusText,
                errorBody: errorText,
                parsedMessage: errorMessage,
            });
            
            const error = new Error(`Failed to fetch from Strava: ${errorMessage}`) as any;
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
    console.log('[fetchRecentStravaActivities] START - Called with idToken');
    
    if (!idToken) {
        console.log('[fetchRecentStravaActivities] No idToken provided');
        return { error: 'User not authenticated.' };
    }

    try {
        const auth = await getServerAuth();
        const db = await getServerDb();
        const decodedToken = await auth.verifyIdToken(idToken, true);
        const userId = decodedToken.uid;

        const userDocSnap = await db.getDoc('app_users', userId);
        const userData = userDocSnap.data;

        console.log('[fetchRecentStravaActivities] Strava data loaded', {
            userId,
            exists: userDocSnap.exists,
            hasStrava: !!userData?.strava,
            stravaKeys: userData?.strava ? Object.keys(userData.strava) : [],
            stravaValue: userData?.strava ? JSON.stringify(userData.strava) : null,
        });

        if (!userDocSnap.exists || !userData?.strava) {
            console.log('[fetchRecentStravaActivities] No strava data found, returning error');
            return { error: 'Could not authenticate with Strava. Please reconnect your account.' };
        }

        const { accessToken, refreshToken, expiresAt, processedActivities } = userData.strava;
        console.log('[fetchRecentStravaActivities] About to validate token', {
            userId,
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            expiresAt,
        });
        
        let validTokens;

        try {
            validTokens = await ensureStravaTokenIsValid(userId, db, {
                accessToken,
                refreshToken,
                expiresAt,
            });
            console.log('[fetchRecentStravaActivities] Token validation succeeded');
        } catch (err: any) {
            console.error('[fetchRecentStravaActivities] Token validation failed:', err.message);
            return { error: err.message || 'Your Strava connection is no longer valid. Please reconnect your account.' };
        }

        const maxRides = Array.isArray(processedActivities) && processedActivities.length > 0
            ? REGULAR_STRAVA_RIDE_LIMIT
            : INITIAL_STRAVA_RIDE_LIMIT;

        console.log('[fetchRecentStravaActivities] Fetching activities', {
            accessToken: validTokens.accessToken?.substring(0, 10) + '...',
            maxRides,
        });

        let allRideActivities: StravaActivity[];
        try {
            allRideActivities = await fetchStravaBikeActivities(validTokens.accessToken, maxRides);
            console.log('[fetchRecentStravaActivities] Fetched activities successfully', {
                count: allRideActivities.length,
                activities: allRideActivities.map(a => ({ id: a.id, name: a.name })),
            });
        } catch (err: any) {
            console.error('[fetchRecentStravaActivities] Activity fetch failed', {
                status: err?.status,
                message: err?.message,
            });
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

        console.log('[fetchRecentStravaActivities] Returning activities', {
            totalFetched: allRideActivities.length,
            alreadySynced: processedActivityIds.size,
            newActivities: activities.filter(a => !a.alreadySynced).length,
        });

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

export async function checkStravaConnection(idToken: string, skipVerification: boolean = false): Promise<{ connected: boolean; error?: string }> {
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

        console.log('[checkStravaConnection] User data check', {
            userId,
            exists: userDocSnap.exists,
            hasStrava: !!userData?.strava,
            stravaValue: JSON.stringify(userData?.strava),
            skipVerification,
        });

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

        // If skipVerification is true (right after OAuth), trust the token and skip API verification
        if (skipVerification) {
            console.log('[checkStravaConnection] Skipping Strava API verification (post-OAuth)');
            return { connected: true };
        }

        const fetchOptions: RequestInit = {
            headers: {
                Authorization: `Bearer ${validTokens.accessToken}`,
                'User-Agent': 'EQPMGR/1.0',
            },
            cache: 'no-store',
        };

        if (process.env.NODE_ENV !== 'production') {
            fetchOptions.agent = new https.Agent({ rejectUnauthorized: false });
        }

        const verifyResponse = await fetch('https://www.strava.com/api/v3/athlete', fetchOptions);
        const verifyResponseText = await verifyResponse.text();
        let verifyResponseData;
        try {
            verifyResponseData = JSON.parse(verifyResponseText);
        } catch {
            verifyResponseData = verifyResponseText;
        }
        
        console.log('[checkStravaConnection] Strava API verify response', {
            status: verifyResponse.status,
            ok: verifyResponse.ok,
            response: verifyResponseData,
        });
        
        if (!verifyResponse.ok) {
            if ([401, 403].includes(verifyResponse.status)) {
                console.log('[checkStravaConnection] Token unauthorized, clearing connection');
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

        console.log('[checkStravaConnection] Verification succeeded, returning connected: true');
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
    const supabase = getSupabaseClient();

    try {
        const decodedToken = await auth.verifyIdToken(idToken, true);
        const userId = decodedToken.uid;

        // Get current equipment data to increment distances
        const { data: equipmentData, error: getEquipmentError } = await supabase
            .from('equipment')
            .select('total_distance, total_hours')
            .eq('id', equipmentId)
            .single();

        if (getEquipmentError) {
            console.error('Error fetching equipment:', getEquipmentError);
        }

        const currentDistance = equipmentData?.total_distance || 0;
        const currentHours = equipmentData?.total_hours || 0;
        const newDistance = currentDistance + (activity.distance / 1000);
        const newHours = currentHours + (activity.moving_time / 3600);

        // Update equipment with new distance/hours
        const { error: updateEquipmentError } = await supabase
            .from('equipment')
            .update({
                total_distance: newDistance,
                total_hours: newHours,
            })
            .eq('id', equipmentId);

        if (updateEquipmentError) {
            console.error('Error updating equipment:', updateEquipmentError);
            // Continue anyway - processedActivities update is more critical
        }

        // Get current strava data
        const { data: userData, error: getUserError } = await supabase
            .from('app_users')
            .select('strava')
            .eq('id', userId)
            .single();

        if (getUserError && getUserError.code !== 'PGRST116') {
            throw getUserError;
        }

        const existingStrava = userData?.strava || {};
        const existingProcessedActivities: string[] = Array.isArray(existingStrava.processedActivities)
            ? existingStrava.processedActivities.map(String)
            : [];
        const mergedProcessedActivities = Array.from(new Set([...existingProcessedActivities, String(activity.id)]));

        const updatedStrava = {
            ...existingStrava,
            processedActivities: mergedProcessedActivities,
        };

        // Update strava field with new processedActivities
        const { error: updateError } = await supabase
            .from('app_users')
            .update({ strava: updatedStrava })
            .eq('id', userId);

        if (updateError) throw updateError;

        console.log('[assignStravaActivityToAction] Successfully assigned activity', {
            userId,
            activityId: activity.id,
            equipmentId,
            processedActivities: mergedProcessedActivities.length,
        });

        return { success: true, message: `Activity '${activity.name}' assigned.` };

    } catch (error: any) {
        console.error("Error assigning Strava activity:", error);
        return { success: false, message: error.message || "An unknown server error occurred." };
    }
}
