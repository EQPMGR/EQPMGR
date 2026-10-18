
'use server';

import https from 'https';
import { createClient } from '@supabase/supabase-js';
import { getServerAuth, getServerDb } from '@/backend';
import type { Equipment } from '@/lib/types';
import { toDate } from '@/lib/date-utils';
import { verifyUserToken } from '@/lib/server-auth';
import { ensureValidStravaToken, clearStravaConnection as clearSharedStravaConnection, isStravaRide, fetchStravaActivity } from '@/lib/strava';
import { recordStravaActivity, describeStravaResult, processPendingStravaEvents } from '@/lib/strava-sync';

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

// Shared helper (src/lib/strava.ts) saves refreshed tokens with the direct client.
async function ensureStravaTokenIsValid(
    userId: string,
    _db: unknown,
    stravaData: any
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number; }> {
    const valid = await ensureValidStravaToken(getSupabaseClient(), userId, stravaData);
    return { accessToken: valid.accessToken, refreshToken: valid.refreshToken, expiresAt: valid.expiresAt };
}

const INITIAL_STRAVA_RIDE_LIMIT = 250;
const REGULAR_STRAVA_RIDE_LIMIT = 25;
const STRAVA_PAGE_SIZE = 30;

type NodeFetchInit = RequestInit & { agent?: https.Agent };

async function fetchStravaBikeActivities(accessToken: string, maxRides: number): Promise<StravaActivity[]> {
    const fetchOptions: NodeFetchInit = {
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
        const rideActivities = rawActivities.filter(activity => isStravaRide(activity as any));
        rides.push(...rideActivities);

        if (rawActivities.length < STRAVA_PAGE_SIZE) {
            break;
        }

        page += 1;
    }

    return rides.slice(0, maxRides);
}

async function clearStravaConnection(userId: string, _db: unknown): Promise<void> {
    await clearSharedStravaConnection(getSupabaseClient(), userId);
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

        // Catch up on any Strava webhook rides that couldn't be processed yet.
        if (userData.strava.athleteId) {
            try {
                await processPendingStravaEvents(getSupabaseClient(), Number(userData.strava.athleteId));
            } catch (err) {
                console.error('[fetchRecentStravaActivities] pending webhook processing failed', err);
            }
        }
        const { data: freshUser } = await getSupabaseClient().from('app_users').select('strava').eq('id', userId).maybeSingle();
        if (freshUser?.strava) userData.strava = freshUser.strava;

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

        const fetchOptions: NodeFetchInit = {
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
    activity: Pick<StravaActivity, 'id' | 'name'>;
    equipmentId: string;
}): Promise<{ success: boolean; message: string; }> {
    if (!idToken || !activity?.id || !equipmentId) {
        return { success: false, message: 'Missing required data.' };
    }

    const supabase = getSupabaseClient();

    try {
        const { uid: userId } = await verifyUserToken(idToken);

        const { data: bike, error: bikeError } = await supabase
            .from('equipment')
            .select('id, type')
            .eq('id', equipmentId)
            .eq('user_id', userId)
            .maybeSingle();
        if (bikeError) throw bikeError;
        if (!bike) return { success: false, message: 'Bike not found.' };

        // Re-fetch the activity from Strava: distance, time and location come
        // from Strava itself, not from the browser.
        const { data: userData, error: getUserError } = await supabase
            .from('app_users')
            .select('strava')
            .eq('id', userId)
            .single();
        if (getUserError) throw getUserError;
        if (!userData?.strava?.accessToken) {
            return { success: false, message: 'Connect Strava first.' };
        }
        const strava = await ensureValidStravaToken(supabase, userId, userData.strava);
        const activityDetail = await fetchStravaActivity(strava.accessToken, activity.id);

        // Assigning by hand also teaches us which Strava bike this is, so
        // future rides on it are assigned automatically.
        const result = await recordStravaActivity(supabase, userId, strava, activityDetail, bike, true);
        return { success: true, message: describeStravaResult(result) };

    } catch (error: any) {
        console.error("Error assigning Strava activity:", error);
        return { success: false, message: error.message || "An unknown server error occurred." };
    }
}

/** Bikes that rides are auto-assigned to, by their linked Strava bike. */
export async function getLinkedStravaBikesAction(idToken: string): Promise<{ bikes: { id: string; name: string; stravaGearName: string | null }[] }> {
    const { uid } = await verifyUserToken(idToken);
    const { data: bikes } = await getSupabaseClient()
        .from('equipment')
        .select('id, name, strava_gear_name')
        .eq('user_id', uid)
        .not('strava_gear_id', 'is', null);
    return { bikes: (bikes ?? []).map((b: any) => ({ id: b.id, name: b.name, stravaGearName: b.strava_gear_name })) };
}

export async function unlinkStravaBikeAction(idToken: string, equipmentId: string): Promise<{ success: boolean }> {
    const { uid } = await verifyUserToken(idToken);
    const { error } = await getSupabaseClient()
        .from('equipment')
        .update({ strava_gear_id: null, strava_gear_name: null })
        .eq('id', equipmentId)
        .eq('user_id', uid);
    return { success: !error };
}
