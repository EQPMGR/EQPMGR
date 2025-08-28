
'use server';

import { cookies } from 'next/headers';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAdminAuth } from '@/lib/firebase-admin';

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

// This function gets the current user's Strava token from Firestore.
// It also handles refreshing the token if it's expired.
async function getStravaTokenForUser(): Promise<StravaTokenData | null> {
    const session = cookies().get('__session')?.value || '';
    if (!session) {
        console.error("No session cookie found. User is not authenticated.");
        return null;
    }

    try {
        const adminAuth = await getAdminAuth();
        const decodedIdToken = await adminAuth.verifySessionCookie(session, true);
        const userDocRef = doc(db, 'users', decodedIdToken.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists() || !userDocSnap.data()?.strava) {
            console.error("User document or Strava data not found.");
            return null;
        }

        let { accessToken, refreshToken, expiresAt } = userDocSnap.data().strava;

        // Check if the token is expired (or close to expiring)
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
                ...userDocSnap.data().strava,
                accessToken: newTokens.access_token,
                refreshToken: newTokens.refresh_token,
                expiresAt: newTokens.expires_at,
            };
            
            await setDoc(userDocRef, { strava: newStravaData }, { merge: true });

            return {
                accessToken: newTokens.access_token,
                refreshToken: newTokens.refresh_token,
                expiresAt: newTokens.expires_at,
            };
        }

        return { accessToken, refreshToken, expiresAt };

    } catch (error) {
        console.error("Error verifying session or getting token:", error);
        return null;
    }
}


export async function fetchRecentStravaActivities(): Promise<{ activities?: StravaActivity[]; error?: string }> {
    const tokenData = await getStravaTokenForUser();

    if (!tokenData) {
        return { error: 'Could not authenticate with Strava. Please reconnect your account.' };
    }

    try {
        const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=10', {
            headers: {
                'Authorization': `Bearer ${tokenData.accessToken}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorBody = await response.json();
            return { error: `Failed to fetch from Strava: ${errorBody.message}` };
        }

        const activities: StravaActivity[] = await response.json();
        return { activities };
    } catch (error: any) {
        console.error("Error fetching Strava activities:", error);
        return { error: error.message || 'An unknown error occurred.' };
    }
}
