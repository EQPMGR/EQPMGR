// Server-only Strava helpers shared by the settings actions and the webhook.
// Not a 'use server' module: exports here must not become public endpoints.
import https from 'https';
import type { SupabaseClient } from '@supabase/supabase-js';
import { accessSecret } from '@/lib/secrets';

export type StravaCredentials = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athleteId?: number;
  processedActivities?: Array<string | number>;
  [key: string]: unknown;
};

type NodeFetchInit = RequestInit & { agent?: https.Agent };

export function stravaFetchOptions(accessToken: string): NodeFetchInit {
  const options: NodeFetchInit = {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'EQPMGR/1.0' },
    cache: 'no-store',
  };
  if (process.env.NODE_ENV !== 'production') {
    options.agent = new https.Agent({ rejectUnauthorized: false });
  }
  return options;
}

export async function clearStravaConnection(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase.from('app_users').update({ strava: null }).eq('id', userId);
  if (error) console.error('Unable to clear Strava credentials for user', userId, error);
}

/**
 * Returns a usable access token, refreshing it if it expires within 5 minutes.
 * The refreshed credentials are saved with the direct client: the db adapter
 * refuses writes to app_users.strava, so saving through it silently failed
 * and every request refreshed again.
 */
export async function ensureValidStravaToken(
  supabase: SupabaseClient,
  userId: string,
  strava: StravaCredentials
): Promise<StravaCredentials> {
  const { accessToken, refreshToken, expiresAt } = strava;
  if (!accessToken || !refreshToken || !expiresAt) {
    throw new Error('Strava credentials are missing or corrupted. Please reconnect your account.');
  }
  if (Math.floor(Date.now() / 1000) <= expiresAt - 300) return strava;

  const [clientId, clientSecret] = await Promise.all([
    accessSecret('NEXT_PUBLIC_STRAVA_CLIENT_ID'),
    accessSecret('STRAVA_CLIENT_SECRET'),
  ]);

  const options: NodeFetchInit = {
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
    options.agent = new https.Agent({ rejectUnauthorized: false });
  }

  const response = await fetch('https://www.strava.com/oauth/token', options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Strava token refresh failed', { status: response.status });
    if ([400, 401, 403].includes(response.status)) await clearStravaConnection(supabase, userId);
    throw new Error(data?.message || 'Strava token refresh failed. Please reconnect your Strava account.');
  }

  const updated: StravaCredentials = {
    ...strava,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: data.expires_at,
  };
  const { error } = await supabase.from('app_users').update({ strava: updated }).eq('id', userId);
  if (error) console.error('Failed to save refreshed Strava token', error);
  return updated;
}

/** Full activity detail (distance, moving_time, start_latlng, sport_type, gear...). */
export async function fetchStravaActivity(accessToken: string, activityId: string | number) {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${encodeURIComponent(String(activityId))}`, stravaFetchOptions(accessToken));
  if (!res.ok) {
    const error = new Error(`Strava activity request failed (${res.status})`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}

/** Strava activity types that count as bike rides. */
export const STRAVA_RIDE_SPORTS = new Set([
  'Ride', 'MountainBikeRide', 'GravelRide', 'EBikeRide', 'EMountainBikeRide', 'VirtualRide', 'Velomobile', 'Handcycle',
]);

export function isStravaRide(activity: { sport_type?: string; type?: string }) {
  return STRAVA_RIDE_SPORTS.has(activity.sport_type || '') || STRAVA_RIDE_SPORTS.has(activity.type || '');
}
