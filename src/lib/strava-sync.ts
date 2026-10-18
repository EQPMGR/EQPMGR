// Server-only: turn a Strava activity into a recorded ride on the right bike.
// Used by manual assignment (settings/apps actions) and the Strava webhook.
import crypto from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { accessSecret } from '@/lib/secrets';
import { ensureValidStravaToken, fetchStravaActivity, clearStravaConnection, isStravaRide, type StravaCredentials } from '@/lib/strava';
import { recordRideAndApplyWear, rideTerrain, rideIsEbike, describeWeather, type RecordedRide } from '@/lib/rides';

export function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase configuration');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Token Strava echoes back when we create the webhook subscription (derived, so no extra env var). */
export async function stravaWebhookVerifyToken(): Promise<string> {
  const secret = await accessSecret('STRAVA_CLIENT_SECRET');
  return crypto.createHash('sha256').update(`${secret}:eqpmgr-strava-webhook`).digest('hex').slice(0, 32);
}

type Bike = { id: string; name: string | null; brand: string | null; model: string | null; type: string | null; strava_gear_id: string | null };

const normalize = (s: string | null | undefined) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Remember which Strava bike this is (moves the link if it pointed at another bike). */
async function linkGear(supabase: SupabaseClient, userId: string, bikeId: string, gearId: string | null | undefined, gearName?: string | null) {
  if (!gearId) return;
  await supabase.from('equipment').update({ strava_gear_id: null, strava_gear_name: null }).eq('user_id', userId).eq('strava_gear_id', gearId).neq('id', bikeId);
  await supabase.from('equipment').update({ strava_gear_id: gearId, strava_gear_name: gearName ?? null }).eq('id', bikeId).eq('user_id', userId);
}

/**
 * Which bike a Strava ride belongs to: the bike linked to its Strava gear, else
 * a unique name match with the Strava bike, else the rider's only bike.
 */
async function pickBike(supabase: SupabaseClient, userId: string, activity: any): Promise<{ bike: Bike; how: string } | null> {
  const { data } = await supabase
    .from('equipment')
    .select('id, name, brand, model, type, strava_gear_id')
    .eq('user_id', userId);
  const bikes = ((data ?? []) as Bike[]).filter((b) => !/shoe/i.test(b.type || ''));
  if (bikes.length === 0) return null;

  const gearId: string | null = activity.gear_id || null;
  if (gearId) {
    const linked = bikes.find((b) => b.strava_gear_id === gearId);
    if (linked) return { bike: linked, how: 'linked Strava bike' };

    const gearName = normalize(activity.gear?.name);
    if (gearName) {
      const matches = bikes.filter((b) => {
        const names = [b.name, `${b.brand || ''}${b.model || ''}`].map(normalize).filter(Boolean);
        return names.some((n) => n === gearName || (n.length > 3 && (n.includes(gearName) || gearName.includes(n))));
      });
      if (matches.length === 1) return { bike: matches[0], how: `matched Strava bike "${activity.gear.name}"` };
    }
  }
  if (bikes.length === 1) return { bike: bikes[0], how: 'only bike' };
  return null;
}

async function markProcessed(supabase: SupabaseClient, userId: string, strava: StravaCredentials, activityId: string) {
  const processed = Array.isArray(strava.processedActivities) ? strava.processedActivities.map(String) : [];
  if (processed.includes(activityId)) return;
  // Read-modify-write of the latest blob so a concurrent token refresh isn't lost.
  const { data } = await supabase.from('app_users').select('strava').eq('id', userId).maybeSingle();
  const latest = (data?.strava || strava) as StravaCredentials;
  const merged = Array.from(new Set([...(latest.processedActivities || []).map(String), activityId]));
  await supabase.from('app_users').update({ strava: { ...latest, processedActivities: merged } }).eq('id', userId);
}

export type StravaRecordResult = { recorded: RecordedRide; activityName: string; bikeId: string };

/** Record one Strava activity on a bike: weather, wear, alerts, processed list. */
export async function recordStravaActivity(
  supabase: SupabaseClient,
  userId: string,
  strava: StravaCredentials,
  activity: any,
  bike: Pick<Bike, 'id' | 'type'>,
  learnGear: boolean
): Promise<StravaRecordResult> {
  const sportType: string | null = activity.sport_type || activity.type || null;
  const [lat, lng] = Array.isArray(activity.start_latlng) && activity.start_latlng.length === 2 ? activity.start_latlng : [null, null];

  const recorded = await recordRideAndApplyWear(supabase, {
    userId,
    equipmentId: bike.id,
    source: 'strava',
    externalId: String(activity.id),
    name: activity.name,
    startedAt: new Date(activity.start_date),
    distanceKm: (activity.distance || 0) / 1000,
    movingHours: (activity.moving_time || 0) / 3600,
    elevationGainM: typeof activity.total_elevation_gain === 'number' ? activity.total_elevation_gain : null,
    sportType,
    terrain: rideTerrain(sportType, bike.type),
    isEbike: rideIsEbike(sportType, bike.type),
    lat,
    lng,
  });

  if (learnGear) await linkGear(supabase, userId, bike.id, activity.gear_id, activity.gear?.name);
  await markProcessed(supabase, userId, strava, String(activity.id));
  return { recorded, activityName: activity.name, bikeId: bike.id };
}

export function describeStravaResult(r: StravaRecordResult): string {
  if (r.recorded.alreadyRecorded) return `'${r.activityName}' was already counted.`;
  return `'${r.activityName}' assigned. ${describeWeather(r.recorded.weather)}`;
}

// ---------------------------------------------------------------------------
// Webhook events
// ---------------------------------------------------------------------------

type WebhookEvent = {
  id: string; object_type: string; aspect_type: string; object_id: number; owner_id: number;
  updates: Record<string, string> | null; status: string; attempts: number;
};

async function findUserByAthlete(supabase: SupabaseClient, athleteId: number) {
  const { data } = await supabase
    .from('app_users')
    .select('id, strava')
    .eq('strava->>athleteId', String(athleteId))
    .limit(1)
    .maybeSingle();
  return data?.strava ? (data as { id: string; strava: StravaCredentials }) : null;
}

async function finish(supabase: SupabaseClient, id: string, status: 'processed' | 'skipped' | 'failed', result: string, attempts: number) {
  await supabase.from('strava_webhook_events')
    .update({ status, result: result.slice(0, 500), processed_at: new Date().toISOString(), attempts: attempts + 1 })
    .eq('id', id);
}

export async function processStravaEvent(supabase: SupabaseClient, eventId: string): Promise<void> {
  const { data: event } = await supabase.from('strava_webhook_events').select('*').eq('id', eventId).maybeSingle();
  const e = event as WebhookEvent | null;
  if (!e || e.status === 'processed' || e.status === 'skipped' || e.attempts >= 5) return;

  try {
    const user = await findUserByAthlete(supabase, e.owner_id);
    if (!user) return finish(supabase, e.id, 'skipped', 'No EQPMGR user for this athlete', e.attempts);

    // Rider revoked access in Strava.
    if (e.object_type === 'athlete' && e.updates?.authorized === 'false') {
      await clearStravaConnection(supabase, user.id);
      return finish(supabase, e.id, 'processed', 'Strava access revoked; connection cleared', e.attempts);
    }

    if (e.object_type !== 'activity' || e.aspect_type !== 'create') {
      // Updates/deletes of already-counted rides aren't reversed yet (see ROADMAP).
      return finish(supabase, e.id, 'skipped', `Ignored ${e.object_type} ${e.aspect_type}`, e.attempts);
    }

    const strava = await ensureValidStravaToken(supabase, user.id, user.strava);
    const activity = await fetchStravaActivity(strava.accessToken, e.object_id);
    if (!isStravaRide(activity)) return finish(supabase, e.id, 'skipped', `Not a ride (${activity.sport_type || activity.type})`, e.attempts);
    if (activity.trainer && activity.sport_type !== 'VirtualRide') {
      return finish(supabase, e.id, 'skipped', 'Indoor trainer ride', e.attempts);
    }

    const pick = await pickBike(supabase, user.id, activity);
    if (!pick) {
      // Stays in the rider's "recent activities" list to assign by hand.
      return finish(supabase, e.id, 'skipped', 'Could not tell which bike; left for the rider to assign', e.attempts);
    }

    const result = await recordStravaActivity(supabase, user.id, strava, activity, pick.bike, pick.how !== 'only bike' || !!activity.gear_id);
    return finish(supabase, e.id, 'processed', `${describeStravaResult(result)} (${pick.how})`, e.attempts);
  } catch (error: any) {
    console.error('[strava webhook] processing failed', eventId, error);
    // 404 = activity deleted or private to us; don't retry those.
    const status = error?.status === 404 ? 'skipped' : 'failed';
    await supabase.from('strava_webhook_events')
      .update({ status, result: String(error?.message || error).slice(0, 500), attempts: e.attempts + 1 })
      .eq('id', e.id);
  }
}

/** Catch-up: process this athlete's queued or failed events (runs when the rider opens the app). */
export async function processPendingStravaEvents(supabase: SupabaseClient, athleteId: number): Promise<number> {
  const { data } = await supabase
    .from('strava_webhook_events')
    .select('id')
    .eq('owner_id', athleteId)
    .in('status', ['pending', 'failed'])
    .lt('attempts', 5)
    .order('received_at')
    .limit(20);
  for (const row of data ?? []) await processStravaEvent(supabase, row.id);
  return data?.length ?? 0;
}
