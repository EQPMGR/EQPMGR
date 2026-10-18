'use server';

import { createClient } from '@supabase/supabase-js';
import { verifyUserToken } from '@/lib/server-auth';
import { recordRideAndApplyWear, rideTerrain, rideIsEbike, describeWeather } from '@/lib/rides';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

/** A ride entered by hand (no Strava). Weather is looked up from the location if given. */
export async function logManualRideAction(
  idToken: string,
  input: {
    equipmentId: string;
    startedAt: string;          // ISO timestamp
    distanceKm: number;
    durationMinutes: number;
    elevationGainM?: number | null;
    terrain: 'auto' | 'road' | 'offroad';
    conditions: 'auto' | 'wet' | 'dry';
    lat?: number | null;
    lng?: number | null;
  }
): Promise<{ success: boolean; message: string; weather?: string | null }> {
  try {
    const { uid } = await verifyUserToken(idToken);

    const startedAt = new Date(input.startedAt);
    if (Number.isNaN(startedAt.getTime()) || startedAt.getTime() > Date.now() + 5 * 60_000) {
      return { success: false, message: 'Enter when the ride started (not in the future).' };
    }
    if (!(input.distanceKm > 0) || input.distanceKm > 1000) {
      return { success: false, message: 'Distance must be between 0 and 1,000 km.' };
    }
    if (input.elevationGainM != null && (input.elevationGainM < 0 || input.elevationGainM > 10000)) {
      return { success: false, message: 'Climbing must be between 0 and 10,000 m.' };
    }
    if (!(input.durationMinutes > 0) || input.durationMinutes > 48 * 60) {
      return { success: false, message: 'Duration must be between 1 minute and 48 hours.' };
    }

    const supabase = getSupabaseClient();
    const { data: bike, error } = await supabase
      .from('equipment')
      .select('id, type')
      .eq('id', input.equipmentId)
      .eq('user_id', uid)
      .maybeSingle();
    if (error) throw error;
    if (!bike) return { success: false, message: 'Bike not found.' };

    const recorded = await recordRideAndApplyWear(supabase, {
      userId: uid,
      equipmentId: bike.id,
      source: 'manual',
      name: 'Manual ride',
      startedAt,
      distanceKm: input.distanceKm,
      movingHours: input.durationMinutes / 60,
      elevationGainM: input.elevationGainM ?? null,
      terrain: input.terrain === 'auto' ? rideTerrain(null, bike.type) : input.terrain,
      isEbike: rideIsEbike(null, bike.type),
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      weatherOverride: input.conditions === 'auto' ? null : input.conditions,
    });

    return {
      success: true,
      message: `Ride logged: ${input.distanceKm} km. ${describeWeather(recorded.weather)}`,
      weather: recorded.weather.summary,
    };
  } catch (error: any) {
    console.error('[logManualRideAction]', error);
    return { success: false, message: error.message || 'Could not log the ride.' };
  }
}
